import { useState } from 'react';
import { Home } from './components/Home';
import { Chat } from './components/Chat';
import { Toaster } from './components/ui/sonner';

export default function App() {
  const [currentView, setCurrentView] = useState<'home' | 'chat'>('home');
  const [chatData, setChatData] = useState<{
    userId: string;
    userName: string;
    language: string;
    chatId: string;
    partnerId: string;
    partnerName: string;
    partnerLanguage: string;
  } | null>(null);

  const handleStartChat = (
    userId: string,
    userName: string,
    language: string,
    chatId: string,
    partnerId: string,
    partnerName: string,
    partnerLanguage: string
  ) => {
    setChatData({ userId, userName, language, chatId, partnerId, partnerName, partnerLanguage });
    setCurrentView('chat');
  };

  const handleExitChat = () => {
    setChatData(null);
    setCurrentView('home');
  };

  return (
    <>
      {currentView === 'home' && (
        <Home onStartChat={handleStartChat} />
      )}
      
      {currentView === 'chat' && chatData && (
        <Chat
          userId={chatData.userId}
          userName={chatData.userName}
          userLanguage={chatData.language}
          chatId={chatData.chatId}
          partnerId={chatData.partnerId}
          partnerName={chatData.partnerName}
          partnerLanguage={chatData.partnerLanguage}
          onExit={handleExitChat}
        />
      )}
      
      <Toaster />
    </>
  );
}
