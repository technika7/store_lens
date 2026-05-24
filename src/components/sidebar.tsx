import React from 'react';
import { Button } from '@/components/ui/button';
import { MessageSquare, Plus, Trash2, Settings } from 'lucide-react';
import { ChatSession } from '@/hooks/use-chat-history';
import { cn } from '@/lib/utils';
import { StoreLensLogo } from '@/components/store-lens-logo';

interface SidebarProps {
  sessions: ChatSession[];
  currentSessionId: string;
  onSelectSession: (id: string) => void;
  onNewSession: () => void;
  onDeleteSession: (id: string) => void;
}

export function Sidebar({ sessions, currentSessionId, onSelectSession, onNewSession, onDeleteSession }: SidebarProps) {
  return (
    <div className="w-64 h-full bg-slate-50 dark:bg-slate-900 border-r flex flex-col shrink-0">
      {/* Brand Logo Header */}
      <div className="p-4 pb-2 pt-5 flex items-center gap-2.5">
        <StoreLensLogo className="w-6 h-6 shrink-0" />
        <span className="font-bold text-slate-800 dark:text-white tracking-tight text-[17px]">StoreLens AI</span>
      </div>

      <div className="p-4 border-b">
        <Button 
          onClick={onNewSession} 
          className="w-full flex items-center gap-2 font-medium"
          variant="default"
        >
          <Plus className="w-4 h-4" />
          New Audit
        </Button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 px-2 mt-2">Past Audits</p>
        
        {sessions.length === 0 ? (
          <p className="text-sm text-slate-400 px-2 italic">No history found</p>
        ) : (
          sessions.map(session => (
            <div 
              key={session.id} 
              className={cn(
                "group flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors",
                currentSessionId === session.id 
                  ? "bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-slate-100" 
                  : "hover:bg-slate-100 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-400"
              )}
              onClick={() => onSelectSession(session.id)}
            >
              <div className="flex items-center gap-2 overflow-hidden flex-1">
                <MessageSquare className="w-4 h-4 shrink-0 opacity-70" />
                <span className="text-sm truncate font-medium">{session.title}</span>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className="w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950 shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteSession(session.id);
                }}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))
        )}
      </div>

      <div className="p-4 border-t flex items-center gap-3">
        <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center shrink-0">
          <StoreLensLogo className="w-4.5 h-4.5" />
        </div>
        <div className="flex flex-col overflow-hidden">
          <span className="text-sm font-semibold truncate">StoreLens AI</span>
          <span className="text-xs text-muted-foreground truncate">Enterprise Plan</span>
        </div>
      </div>
    </div>
  );
}
