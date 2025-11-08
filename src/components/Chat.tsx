import { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card } from './ui/card';
import { Send, Mic, MicOff, Volume2, ArrowLeft, User, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { VoiceAndLanguageSelector } from './VoiceAndLanguageSelector';
import { ImageWithFallback } from './figma/ImageWithFallback';

interface Message {
  id: string;
  fromId: string;
  text: string;
  translatedText: string;
  timestamp: string;
}

interface ChatProps {
  userId: string;
  userName: string;
  userLanguage: string;
  chatId: string;
  partnerId: string;
  partnerName: string;
  partnerLanguage: string;
  onExit: () => void;
}

export function Chat({ userId, userName, userLanguage: initialUserLanguage, chatId, partnerId, partnerName, partnerLanguage: initialPartnerLanguage, onExit }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [showVoiceSelector, setShowVoiceSelector] = useState(false);
  const [userLanguage, setUserLanguage] = useState(initialUserLanguage);
  const [partnerLanguage] = useState(initialPartnerLanguage);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const pollIntervalRef = useRef<any>(null);

  useEffect(() => {
    loadMessages();
    
    // Polling para nuevos mensajes cada 2 segundos
    pollIntervalRef.current = setInterval(() => {
      loadMessages();
    }, 2000);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [chatId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadMessages = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-71bd6d9a/messages/${chatId}`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`
          }
        }
      );

      const data = await response.json();
      
      if (data.success) {
        setMessages(data.messages);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-71bd6d9a/message/send`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`
          },
          body: JSON.stringify({
            chatId,
            fromId: userId,
            text,
            fromLanguage: userLanguage,
            toLanguage: partnerLanguage
          })
        }
      );

      const data = await response.json();
      
      if (data.success) {
        setInputText('');
        await loadMessages();
      } else {
        toast.error('Error al enviar mensaje');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Error de conexión');
    }
  };

  const handleSendMessage = () => {
    sendMessage(inputText);
  };

  const startRecording = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast.error('Tu navegador no soporta reconocimiento de voz');
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.lang = userLanguage === 'es' ? 'es-ES' : 'en-US';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsRecording(true);
      toast.info('Escuchando...');
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      sendMessage(transcript);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsRecording(false);
      toast.error('Error al reconocer voz');
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };

  const speakMessage = (text: string) => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = userLanguage === 'es' ? 'es-ES' : 'en-US';
    
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => {
      setIsSpeaking(false);
      toast.error('Error al reproducir audio');
    };

    window.speechSynthesis.speak(utterance);
  };

  const handleExit = () => {
    localStorage.removeItem('fionar_user');
    onExit();
  };

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      {/* Header */}
      <div className="bg-white/95 backdrop-blur-sm border-b-2 border-purple-200 shadow-lg">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleExit}
              className="hover:bg-purple-100"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <ImageWithFallback 
              src="https://www.webcincodev.com/blog/wp-content/uploads/2025/10/ogimage-1.png"
              alt="FionAR"
              className="w-10 h-10 object-contain"
            />
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center shadow-md">
                <User className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="font-semibold">{partnerName}</h2>
                <p className="text-xs text-gray-500">
                  {partnerLanguage === 'es' ? 'Español' : 'English'}
                </p>
              </div>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowVoiceSelector(!showVoiceSelector)}
            className="border-2 border-purple-200 hover:bg-purple-50"
          >
            <Volume2 className="h-4 w-4 mr-2" />
            Voz
          </Button>
        </div>
        
        {showVoiceSelector && (
          <div className="max-w-4xl mx-auto px-4 pb-3">
            <VoiceAndLanguageSelector
              language={userLanguage}
              onSelectVoice={setSelectedVoice}
              selectedVoice={selectedVoice}
              onChangeLanguage={(newLang) => {
                setUserLanguage(newLang);
                toast.success(
                  newLang === 'es' 
                    ? 'Idioma cambiado a Español' 
                    : 'Language changed to English'
                );
              }}
            />
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-gray-500 mt-8">
              <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No hay mensajes aún</p>
              <p className="text-sm">¡Empieza la conversación!</p>
            </div>
          )}
          
          {messages.map((message) => {
            const isOwn = message.fromId === userId;
            const displayText = isOwn ? message.text : message.translatedText;
            const originalText = isOwn ? message.translatedText : message.text;

            return (
              <div
                key={message.id}
                className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[70%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                  <Card
                    className={`p-3 shadow-md ${
                      isOwn
                        ? 'bg-gradient-to-br from-purple-500 to-pink-500 text-white'
                        : 'bg-white border-2 border-purple-100'
                    }`}
                  >
                    <p className="break-words">{displayText}</p>
                    {originalText && (
                      <p className={`text-xs mt-1 ${isOwn ? 'text-purple-100' : 'text-gray-500'}`}>
                        Original: {originalText}
                      </p>
                    )}
                  </Card>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2"
                      onClick={() => speakMessage(displayText)}
                    >
                      <Volume2 className="h-3 w-3" />
                    </Button>
                    <span className="text-xs text-gray-500">
                      {new Date(message.timestamp).toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="bg-white/95 backdrop-blur-sm border-t-2 border-purple-200 shadow-lg">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex gap-2">
            <Button
              variant={isRecording ? 'destructive' : 'outline'}
              size="icon"
              onClick={isRecording ? stopRecording : startRecording}
              className={isRecording ? '' : 'border-2 border-purple-200 hover:bg-purple-50'}
            >
              {isRecording ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </Button>
            <Input
              placeholder={userLanguage === 'es' ? 'Escribe un mensaje...' : 'Type a message...'}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              className="flex-1 border-2 border-purple-200 focus:border-purple-400"
            />
            <Button 
              onClick={handleSendMessage} 
              disabled={!inputText.trim()}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-md"
            >
              <Send className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function MessageCircle({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}
