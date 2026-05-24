import React from 'react';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TimestampBadgeProps {
  time: Date;
  label?: string;
  color?: 'slate' | 'blue' | 'purple' | 'emerald';
  stepInfo?: string;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit', 
    hour12: false 
  });
}

/**
 * TimestampBadge Component
 *
 * Renders a highly precise metadata event time badge for conversational 
 * actions and tool executions in tabular layout.
 */
export function TimestampBadge({ time, label, color = 'slate', stepInfo }: TimestampBadgeProps) {
  const colors = {
    slate: 'text-slate-400 dark:text-slate-500',
    blue: 'text-blue-500 dark:text-blue-400',
    purple: 'text-purple-500 dark:text-purple-400',
    emerald: 'text-emerald-500 dark:text-emerald-400',
  };
  return (
    <div className={cn('flex items-center gap-1.5 mt-1 text-[10px] tabular-nums', colors[color])}>
      <Clock className="w-3 h-3 shrink-0" />
      <span>{formatTime(time)}</span>
      {label && <span className="opacity-70">· {label}</span>}
      {stepInfo && <span className="ml-1 px-1.5 py-0 rounded bg-current/10 font-medium opacity-80">{stepInfo}</span>}
    </div>
  );
}
