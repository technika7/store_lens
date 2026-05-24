import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, UIMessage } from 'ai';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Globe, User } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';
import { StoreLensLogo } from '@/components/store-lens-logo';
import { TimestampBadge } from '@/components/timestamp-badge';
import { TypingIndicator } from '@/components/typing-indicator';
import { ToolUI } from '@/components/tool-ui';

export interface ChatAreaProps {
  sessionId: string;
  initialMessages: UIMessage[];
  onUpdateMessages: (id: string, msgs: UIMessage[], meta?: any) => void;
  appMetadataRef: React.MutableRefObject<any>;
}

/**
 * ChatArea Component
 *
 * Coordinates message streaming, generative UI tools, session syncing,
 * and user interactions inside a clean, high-performance viewport.
 */
export function ChatArea({ sessionId, initialMessages, onUpdateMessages, appMetadataRef }: ChatAreaProps) {
  const [initMsgs] = useState(initialMessages);

  const chatTransport = useMemo(() => {
    return new DefaultChatTransport({
      api: '/api/chat',
    });
  }, [sessionId]);

  const { messages, sendMessage, status, setMessages } = useChat({
    id: sessionId,
    messages: initMsgs,
    transport: chatTransport,
  });

  const [input, setInput] = useState('');
  const isLoading = status === 'streaming' || status === 'submitted';

  const [msgTimestamps, setMsgTimestamps] = useState<Record<string, Date>>({});
  const [isMounted, setIsMounted] = useState(false);
  const prevMsgCount = useRef(0);
  const lastMessagesLength = useRef(0);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Update timestamps for new incoming messages
  useEffect(() => {
    if (messages.length > prevMsgCount.current) {
      const now = new Date();
      const newEntries: Record<string, Date> = {};
      for (let i = prevMsgCount.current; i < messages.length; i++) {
        newEntries[messages[i].id] = now;
      }
      setMsgTimestamps((prev) => ({ ...prev, ...newEntries }));
      prevMsgCount.current = messages.length;
    }
  }, [messages]);

  // Extracts fetched app metadata from the chat tool outputs to share across components
  const appMetadata = useMemo(() => {
    const allParts = messages.flatMap((m: any) => m.parts ?? []);
    const fetchTool = allParts.find((p: any) =>
      (p.type === 'tool-result' && p.toolName === 'fetchAppMetadata') ||
      (p.type === 'tool-invocation' && p.toolInvocation?.toolName === 'fetchAppMetadata' && p.toolInvocation?.state === 'result') ||
      (p.type === 'tool-fetchAppMetadata' && p.state === 'output-available')
    );
    return fetchTool?.result || fetchTool?.toolInvocation?.result || fetchTool?.output;
  }, [messages]);

  const lastSyncTime = useRef(0);

  // Sync state to parent and persist to localStorage (throttled at 800ms during active streams)
  useEffect(() => {
    const isStreaming = status === 'streaming' || status === 'submitted';
    const hasMsgCountChanged = messages.length !== lastMessagesLength.current;
    const now = Date.now();

    const shouldThrottle = isStreaming && !hasMsgCountChanged && (now - lastSyncTime.current < 800);

    if (!shouldThrottle) {
      lastMessagesLength.current = messages.length;
      lastSyncTime.current = now;
      appMetadataRef.current = appMetadata;
      onUpdateMessages(sessionId, messages, appMetadata);
    }
  }, [messages, sessionId, appMetadata, onUpdateMessages, appMetadataRef, status]);

  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage({ text: input });
    setInput('');
  };

  const handleRunAudit = () => {
    sendMessage({ text: 'Yes, run the audit please.' });
  };

  /**
   * Helper that filters redundant raw tool calls that are already resolved,
   * preventing duplicate rendered states in the chat list.
   */
  const getRenderableParts = (message: UIMessage) => {
    const parts = (message as any).parts;
    if (!parts || parts.length === 0) return [];

    return parts.filter((part: any) => {
      if (part.type === 'tool-call') {
        const hasFinishedResult = parts.some(
          (p: any) => p.type === 'tool-result' && p.toolCallId === part.toolCallId
        );
        return !hasFinishedResult;
      }
      return true;
    });
  };

  return (
    <div className="flex flex-col flex-1 h-full min-w-0 bg-slate-950 overflow-hidden relative print-area">
      {/* Scrollable Conversation Viewport */}
      <div className={cn("flex-1 overflow-y-auto print:overflow-visible transition-colors duration-500 bg-slate-950", messages.length === 0 ? "bg-gradient-to-br from-slate-950 via-emerald-950/15 to-slate-950" : "")}>
        <div className="max-w-4xl mx-auto px-6 py-10 space-y-8 pb-32 print:p-0 print:m-0 print:max-w-none print:w-full h-full">

          {/* Hero Landing State */}
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              {/* Branded Logo Icon */}
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-6 border border-emerald-500/20 shrink-0">
                <StoreLensLogo className="w-10 h-10" />
              </div>
              <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
                Start a New ASO Audit
              </h2>
              <p className="text-lg text-slate-600 dark:text-slate-400 max-w-lg mx-auto mb-12">
                Paste an Apple App Store URL below to instantly fetch metadata and run a comprehensive 10-dimension health audit.
              </p>

              <form onSubmit={handleSubmit} className="w-full max-w-2xl relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full blur opacity-20 group-hover:opacity-50 transition duration-1000 group-hover:duration-200" />
                <div className="relative flex items-center bg-white dark:bg-slate-900 rounded-full p-2 pl-6 shadow-xl ring-1 ring-slate-900/5 dark:ring-white/10">
                  <Globe className="w-6 h-6 text-slate-400 shrink-0" />
                  <input
                    type="url"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Enter App Store URL..."
                    className="flex-1 bg-transparent border-none focus:ring-0 text-lg px-4 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 h-14 outline-none"
                    disabled={isLoading}
                    autoFocus
                  />
                  <Button
                    type="submit"
                    disabled={isLoading || !input.trim()}
                    className="rounded-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-8 h-12 text-base transition-all shadow-md shrink-0"
                  >
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Run Audit'}
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* Interactive Message Flow */}
          {messages.map((m) => {
            const msgTime = msgTimestamps[m.id] ?? new Date();
            const hasAuditResult = m.parts?.some((part: any) => {
              const toolName = part.toolName || part.toolInvocation?.toolName || part.type?.replace(/^tool-/, '');
              return toolName === 'runASOAudit';
            });
            const renderableParts = getRenderableParts(m);

            return (
              <div
                key={m.id}
                className={cn(
                  'flex gap-4 w-full',
                  hasAuditResult ? '' : 'print:hidden',
                  m.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                <div className={cn('flex flex-col gap-2 max-w-full', m.role === 'user' ? 'items-end' : 'items-start flex-1 min-w-0')}>
                  {renderableParts.length > 0 ? (
                    renderableParts.map((part: any, i: number) => {
                      // Render standard text messages
                      if (part.type === 'text' && part.text) {
                        return (
                          <div key={i} className={cn("px-1 py-1 text-[15px] leading-relaxed text-slate-800 dark:text-slate-200", m.role === 'user' ? "w-full max-w-2xl" : "")}>
                            {m.role === 'user' ? (
                              <div className="bg-slate-100 dark:bg-slate-800/80 px-5 py-3 rounded-2xl rounded-tr-sm text-[15px] font-medium text-slate-900 dark:text-slate-100 shadow-sm border border-slate-200/50 dark:border-slate-700/50">
                                {part.text}
                              </div>
                            ) : (
                              <div className="prose prose-slate dark:prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-slate-900 prose-pre:text-slate-50">
                                <ReactMarkdown>
                                  {part.text}
                                </ReactMarkdown>
                              </div>
                            )}
                          </div>
                        );
                      }

                      // Render generative UI tools (e.g. metadata or full audit dashboard)
                      if (part.type === 'tool-invocation' || part.type?.startsWith('tool-')) {
                        const normalizedPart = part.type === 'tool-invocation' ? part : {
                          type: 'tool-invocation',
                          toolInvocation: {
                            ...part,
                            toolName: part.toolName || part.type.replace(/^tool-/, ''),
                            state: part.type === 'tool-result' ? 'result' : (part.state === 'output-available' ? 'result' : part.state || 'call'),
                            result: part.result || part.output,
                          },
                        };
                        return (
                          <div key={i} className="w-full">
                            <ToolUI
                              part={normalizedPart}
                              timestamp={msgTime}
                              onRunAudit={handleRunAudit}
                              onReset={() => setMessages([])}
                              appMetadata={appMetadata}
                              isMounted={isMounted}
                            />
                          </div>
                        );
                      }
                      return null;
                    })
                  ) : (
                    (m as any).content && (
                      <div className={cn("px-1 py-1 text-[15px] leading-relaxed text-slate-800 dark:text-slate-200", m.role === 'user' ? "w-full max-w-2xl" : "")}>
                        {m.role === 'user' ? (
                          <div className="bg-slate-100 dark:bg-slate-800/80 px-5 py-3 rounded-2xl rounded-tr-sm text-[15px] font-medium text-slate-900 dark:text-slate-100 shadow-sm border border-slate-200/50 dark:border-slate-700/50">
                            {(m as any).content}
                          </div>
                        ) : (
                          <div className="prose prose-slate dark:prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-slate-900 prose-pre:text-slate-50">
                            <ReactMarkdown>
                              {(m as any).content}
                            </ReactMarkdown>
                          </div>
                        )}
                      </div>
                    )
                  )}
                </div>

                {m.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center shrink-0 mt-1">
                    <User className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                  </div>
                )}
              </div>
            );
          })}

          {/* Pipeline Loading State Indicator */}
          {(() => {
            const lastMsg = messages.at(-1) as any;
            if (!isLoading || !lastMsg) return null;
            const isUser = lastMsg.role === 'user';
            const isEmptyAssistant = lastMsg.role === 'assistant' && !lastMsg.content && (!lastMsg.parts || lastMsg.parts.length === 0);

            if (isUser || isEmptyAssistant) {
              let mode: 'metadata' | 'audit' | 'thinking' = 'thinking';

              const hasAudit = messages.some(m => m.parts?.some((p: any) =>
                p.toolInvocation?.toolName === 'runASOAudit' || p.type?.includes('runASOAudit')
              ) || (m as any).content?.includes('runASOAudit'));

              if (messages.length === 1) {
                mode = 'metadata';
              } else if (!hasAudit) {
                mode = 'audit';
              }

              return <TypingIndicator mode={mode} />;
            }
            return null;
          })()}

          <div ref={bottomRef} className="print:hidden h-8" />
        </div>
      </div>

      {/* Chat Input Bar */}
      {messages.length > 0 && (
        <div className="shrink-0 p-4 bg-white dark:bg-slate-950 border-t print:hidden">
          <div className="max-w-3xl mx-auto">
            <form onSubmit={handleSubmit} className="flex gap-3">
              <Input
                id="chat-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask follow-up questions..."
                className="rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 px-4 h-12 text-sm focus-visible:ring-1 focus-visible:ring-slate-400 shadow-none"
                disabled={isLoading}
                autoFocus
              />
              <Button
                id="chat-submit"
                type="submit"
                disabled={isLoading || !input.trim()}
                className="rounded-lg px-6 h-12 shrink-0 shadow-none font-medium"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send'}
              </Button>
            </form>
            <div className="flex justify-center items-center gap-4 mt-3">
              <p className="text-[10px] text-slate-400 font-medium">Powered by NVIDIA Llama 3.1 & StoreLens AI</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
