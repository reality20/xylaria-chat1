import { ChatInterface } from './components/chat-interface';
import { CallModal } from './components/call-modal';
import { useState, useCallback } from 'react';

export default function App() {
  const [isCallOpen, setIsCallOpen] = useState(false);
  const [callMode, setCallMode] = useState<'voice' | 'video'>('voice');

  const openVoiceCall = useCallback(() => {
    setCallMode('voice');
    setIsCallOpen(true);
  }, []);

  const openVideoCall = useCallback(() => {
    setCallMode('video');
    setIsCallOpen(true);
  }, []);

  return (
    <>
      <ChatInterface onVoiceCall={openVoiceCall} onVideoCall={openVideoCall} />
      <CallModal 
        isOpen={isCallOpen} 
        onClose={() => setIsCallOpen(false)} 
        mode={callMode}
      />
    </>
  );
}
