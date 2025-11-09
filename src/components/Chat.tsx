
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../utils/supabase/client';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from './ui/card';
import { toast } from 'sonner';
import { Session } from '@supabase/supabase-js';

interface ChatProps {
  session: Session;
  chatId: string;
  partnerId: string;
  onExit: () => void;
}

interface Message {
  id: number;
  sender_id: string;
  text: string;
  translated_text: string | null;
  created_at: string;
}

interface Profile {
  name: string;
  language: string;
}

export function Chat({ session, chatId, partnerId, onExit }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const currentUserLanguage = profiles[session.user.id]?.language;

  // Scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Fetch profiles and initial messages
  useEffect(() => {
    const fetchInitialData = async () => {
      // Fetch profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, name, language')
        .in('id', [session.user.id, partnerId]);

      if (profilesError) {
        toast.error('Error al cargar los perfiles.');
        console.error('Profile fetch error:', profilesError);
        return;
      }

      const profilesMap = profilesData.reduce((acc, profile) => {
        acc[profile.id] = { name: profile.name, language: profile.language };
        return acc;
      }, {} as Record<string, Profile>);
      setProfiles(profilesMap);

      // Fetch initial messages
      const { data: messagesData, error: messagesError } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true });

      if (messagesError) {
        toast.error('Error al cargar los mensajes.');
        console.error('Message fetch error:', messagesError);
      } else {
        setMessages(messagesData);
      }
    };

    fetchInitialData();
  }, [chatId, session.user.id, partnerId]);

  // Real-time subscription for new messages
  useEffect(() => {
    const subscription = supabase
      .channel(`chat_${chatId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT and UPDATE
          schema: 'public',
          table: 'messages',
          filter: `chat_id=eq.${chatId}`,
        },
        (payload) => {
            const changedMessage = payload.new as Message;
            setMessages(currentMessages => {
                const messageExists = currentMessages.find(m => m.id === changedMessage.id);
                if (messageExists) {
                    // It's an update (likely a translation came in)
                    return currentMessages.map(m => m.id === changedMessage.id ? changedMessage : m);
                } else {
                    // It's a new message
                    return [...currentMessages, changedMessage];
                }
            });

            // If a new message arrives that is not from the current user, and translation is needed
            if (payload.eventType === 'INSERT' && changedMessage.sender_id !== session.user.id) {
                const senderLanguage = profiles[changedMessage.sender_id]?.language;
                if (senderLanguage && currentUserLanguage && senderLanguage !== currentUserLanguage) {
                    // Call the Edge Function to translate
                    supabase.functions.invoke('translate', {
                        body: { messageId: changedMessage.id, targetLang: currentUserLanguage },
                    });
                }
            }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [chatId, session.user.id, profiles, currentUserLanguage]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    setLoading(true);
    const text = newMessage.trim();
    setNewMessage('');

    const { error } = await supabase.from('messages').insert({
      chat_id: chatId,
      sender_id: session.user.id,
      text: text,
    });

    if (error) {
      console.error('Send message error:', error);
      toast.error('No se pudo enviar el mensaje.');
      setNewMessage(text); // Put the message back in the input
    }
    setLoading(false);
  };
  
  return (
    <div className="min-h-screen flex flex-col p-4 bg-gray-50">
      <Card className="flex-1 flex flex-col">
        <CardHeader className="border-b">
          <div className="flex justify-between items-center">
            <CardTitle>Chat con {profiles[partnerId]?.name || '...'}</CardTitle>
            <Button variant="outline" size="sm" onClick={onExit}>Salir</Button>
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg) => {
            const isSender = msg.sender_id === session.user.id;
            const senderName = profiles[msg.sender_id]?.name || 'Usuario';

            return (
              <div key={msg.id} className={`flex flex-col ${isSender ? 'items-end' : 'items-start'}`}>
                <div className={`rounded-lg px-4 py-2 max-w-sm ${isSender ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}>
                  <p className="font-bold text-sm">{isSender ? 'Tú' : senderName}</p>
                  <p>{msg.text}</p>
                  {msg.translated_text && (
                     <p className="text-xs italic border-t border-gray-400 mt-1 pt-1">{msg.translated_text}</p>
                  )}
                </div>
              </div>
            );
          })}
           <div ref={messagesEndRef} />
        </CardContent>

        <CardFooter className="border-t pt-4">
          <form onSubmit={handleSendMessage} className="flex w-full gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Escribe un mensaje..."
              disabled={loading}
            />
            <Button type="submit" disabled={loading}>
              {loading ? 'Enviando...' : 'Enviar'}
            </Button>
          </form>
        </CardFooter>
      </Card>
    </div>
  );
}
