'use client';

import { useState, useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { Sidebar } from '@/components/sidebar';
import { ChatArea } from '@/components/chat-area';
import { useChatHistory } from '@/hooks/use-chat-history';

/**
 * ASOApp Page Component
 *
 * Coordinates high-level route rendering, responsive screen layouts,
 * conversation list management, state persistence, and sidebar selection logic.
 */
export default function ASOApp() {
  const { sessions, isLoaded, saveSession, deleteSession } = useChatHistory();
  const [currentSessionId, setCurrentSessionId] = useState<string>('');
  const appMetadataRef = useRef<any>(null);

  // Synchronize active session state
  useEffect(() => {
    if (isLoaded && !currentSessionId) {
      if (sessions.length > 0) {
        setCurrentSessionId(sessions[0].id);
      } else {
        setCurrentSessionId(crypto.randomUUID());
      }
    }
  }, [isLoaded, currentSessionId, sessions]);

  // Handle loading and bootstrap state
  if (!isLoaded || !currentSessionId) {
    return (
      <div className="h-screen w-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-300" />
      </div>
    );
  }

  const currentSession = sessions.find((s) => s.id === currentSessionId);
  const initialMessages = currentSession?.messages || [];

  return (
    <div className="flex h-screen w-full bg-slate-950 overflow-hidden font-sans">
      {/* Sidebar Navigation */}
      <div className="hidden md:block print:hidden">
        <Sidebar
          sessions={sessions}
          currentSessionId={currentSessionId}
          onSelectSession={setCurrentSessionId}
          onNewSession={() => setCurrentSessionId(crypto.randomUUID())}
          onDeleteSession={deleteSession}
        />
      </div>

      {/* Main Conversational Workspace */}
      <ChatArea
        key={currentSessionId}
        sessionId={currentSessionId}
        initialMessages={initialMessages}
        onUpdateMessages={saveSession}
        appMetadataRef={appMetadataRef}
      />
    </div>
  );
}
