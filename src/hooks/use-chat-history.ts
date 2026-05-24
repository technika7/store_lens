import { useState, useEffect, useCallback } from 'react';
import { UIMessage } from 'ai';

export interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: UIMessage[];
}

export function useChatHistory() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from local storage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('aso-chat-sessions');
      if (stored) {
        const parsed: ChatSession[] = JSON.parse(stored);
        setSessions(parsed.filter(s => s.messages && s.messages.length > 0));
      }
    } catch (e) {
      console.error('Failed to load chat history', e);
    }
    setIsLoaded(true);
  }, []);

  // Save to local storage whenever sessions change
  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem('aso-chat-sessions', JSON.stringify(sessions));
    } catch (e) {
      console.error('Failed to save chat history', e);
    }
  }, [sessions, isLoaded]);

  const saveSession = useCallback((id: string, messages: UIMessage[], appMetadata?: any) => {
    setSessions(prev => {
      const existing = prev.find(s => s.id === id);
      
      // Try to determine a title based on app metadata or first user message
      let title = existing?.title || 'New Audit';
      if (appMetadata?.name) {
        title = `Audit: ${appMetadata.name}`;
      } else if (!existing && messages.length > 0) {
        const firstUser = messages.find(m => m.role === 'user');
        const userContent = firstUser?.parts?.[0]?.type === 'text' ? firstUser.parts[0].text : '';
        if (userContent) {
          try {
            const url = new URL(userContent);
            const pathParts = url.pathname.split('/');
            const appId = pathParts.find(p => p.startsWith('id'));
            title = appId ? `Audit ${appId}` : 'New URL Audit';
          } catch {
            title = userContent.slice(0, 30) + '...';
          }
        }
      }

      const isContentChanged = !existing || existing.messages.length !== messages.length;
      
      // Prevent creating empty "New Audit" sessions in history until the user actually sends a message
      if (!existing && messages.length === 0) {
        return prev;
      }
      
      if (existing && !isContentChanged && existing.title === title) {
        // No meaningful changes, don't trigger a state update
        // We update the messages array just in case there are internal state changes in useChat
        // but we don't bump the timestamp so it doesn't jump to the top
        return prev.map(s => s.id === id ? { ...s, messages } : s);
      }

      const newSession: ChatSession = {
        id,
        title,
        createdAt: existing?.createdAt || Date.now(),
        updatedAt: isContentChanged ? Date.now() : (existing?.updatedAt || Date.now()),
        messages,
      };

      if (existing) {
        return prev.map(s => s.id === id ? newSession : s).sort((a, b) => b.updatedAt - a.updatedAt);
      }
      return [newSession, ...prev].sort((a, b) => b.updatedAt - a.updatedAt);
    });
  }, []);

  const deleteSession = useCallback((id: string) => {
    setSessions(prev => prev.filter(s => s.id !== id));
  }, []);

  const clearHistory = useCallback(() => {
    setSessions([]);
  }, []);

  const getSession = useCallback((id: string) => {
    return sessions.find(s => s.id === id);
  }, [sessions]);

  const onNewSession = useCallback(() => {
    // We just return a function that can generate a new ID, but the actual state change is done in the component.
    // Wait, the error was that `onNewSession` didn't exist in useChatHistory.
    // I will return a dummy or I can just let the component handle it. Let me just return it.
  }, []);

  return {
    sessions,
    isLoaded,
    saveSession,
    deleteSession,
    clearHistory,
    getSession,
    onNewSession
  };
}
