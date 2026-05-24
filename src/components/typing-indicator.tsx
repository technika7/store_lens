import React, { useState, useEffect } from 'react';

export interface TypingIndicatorProps {
  mode: 'metadata' | 'audit' | 'thinking';
}

const TYPING_STAGES = [
  { emoji: '🔍', text: 'Connecting to App Store API...' },
  { emoji: '🏷️', text: 'Extracting Title & Subtitle metadata...' },
  { emoji: '📈', text: 'Analyzing ranking keyword density...' },
  { emoji: '🖼️', text: 'Evaluating screenshots & creative assets...' },
  { emoji: '🎥', text: 'Inspecting app preview video presence...' },
  { emoji: '📊', text: 'Grading 10-dimension ASO audit metrics...' },
  { emoji: '🏁', text: 'Benchmarking against category leaders...' },
  { emoji: '⚡', text: 'Compiling high-impact recommendations...' },
  { emoji: '🧠', text: 'Synthesizing strategic action plan...' },
  { emoji: '✍️', text: 'Writing your final comprehensive report...' },
];

/**
 * TypingIndicator Component
 *
 * Renders a high-fidelity dynamic loading indicator highlighting the active 
 * pipeline scanning step during metadata parsing or audit compilation.
 */
export function TypingIndicator({ mode }: TypingIndicatorProps) {
  const [stage, setStage] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (mode !== 'audit') return;
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setStage(prev => Math.min(prev + 1, TYPING_STAGES.length - 1));
        setVisible(true);
      }, 300);
    }, 2500);
    return () => clearInterval(interval);
  }, [mode]);

  const current = mode === 'audit'
    ? TYPING_STAGES[stage]
    : { emoji: mode === 'metadata' ? '🔍' : '🧠', text: mode === 'metadata' ? 'Fetching App Metadata...' : 'Agent is thinking...' };

  return (
    <div className="flex gap-3 justify-start items-center print:hidden">
      <div className="w-8 h-8 rounded-md bg-slate-900 dark:bg-slate-100 flex items-center justify-center shrink-0 text-base">
        <span className={`transition-all duration-300 ${visible || mode !== 'audit' ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}`}>
          {current.emoji}
        </span>
      </div>
      <div className="px-4 py-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm rounded-tl-sm flex items-center gap-3 min-w-[260px]">
        <span className={`text-sm font-medium text-slate-600 dark:text-slate-300 transition-all duration-300 ${visible || mode !== 'audit' ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1'}`}>
          {current.text}
        </span>
        <span className="flex gap-0.5 ml-auto shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-500 animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-500 animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-500 animate-bounce" style={{ animationDelay: '300ms' }} />
        </span>
      </div>
    </div>
  );
}
