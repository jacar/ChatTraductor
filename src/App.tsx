
import { useState, useEffect } from 'react';
import { supabase } from './utils/supabase/client';
import { Home } from './components/Home';
import { Chat } from './components/Chat';
import { Toaster } from './components/ui/sonner';
import { Session } from '@supabase/supabase-js';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [currentView, setCurrentView] = useState<'home' | 'chat'>('home');
  const [chatData, setChatData] = useState<{
    chatId: string;
    partnerId: string;
  } | null>(null);

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);

      if (!session) {
        const { data: newSessionData, error } = await supabase.auth.signInAnonymously();
        if (error) {
          console.error('Error signing in anonymously:', error);
        } else {
          setSession(newSessionData.session);
        }
      }
    };

    getSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleStartChat = (chatId: string, partnerId: string) => {
    setChatData({ chatId, partnerId });
    setCurrentView('chat');
  };

  const handleExitChat = () => {
    setChatData(null);
    setCurrentView('home');
  };

  if (!session) {
    // You can render a loading spinner here while the session is being established
    return <div>Loading...</div>;
  }

  return (
    <>
      {currentView === 'home' && (
        <Home session={session} onStartChat={handleStartChat} />
      )}
      
      {currentView === 'chat' && chatData && session && (
        <Chat
          session={session}
          chatId={chatData.chatId}
          partnerId={chatData.partnerId}
          onExit={handleExitChat}
        />
      )}
      
      <Toaster />
    </>
  );
}
