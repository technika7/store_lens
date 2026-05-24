import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Target, CheckCircle2, Printer } from 'lucide-react';
import { AuditDashboard } from '@/components/audit-dashboard';
import { TimestampBadge } from '@/components/timestamp-badge';

export interface ToolUIProps {
  part: any;
  timestamp: Date;
  onRunAudit: () => void;
  onReset: () => void;
  appMetadata?: any;
  isMounted?: boolean;
}

/**
 * ToolUI Component
 *
 * Directs generative UI component rendering for completed agent tools
 * (fetching app metadata and running full audit dashboards).
 */
export function ToolUI({ part, timestamp, onRunAudit, onReset, appMetadata, isMounted }: ToolUIProps) {
  const ti = part.toolInvocation;
  if (!ti) return null;

  if (ti.toolName === 'fetchAppMetadata') {
    if (ti.state === 'result' && ti.result && !ti.result.error) {
      const r = ti.result;
      return (
        <div className="w-full max-w-2xl my-2">
          <Card className="border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 overflow-hidden p-0 gap-0">
            <CardHeader className="px-4 py-3 border-b bg-slate-50 dark:bg-slate-900/50">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-slate-800 dark:text-slate-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> App Verified
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 p-4">
              <div className="flex items-center gap-4">
                {r.icon ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.icon} alt={r.name} className="w-14 h-14 rounded-lg shadow-sm object-cover ring-1 ring-slate-200 dark:ring-slate-800" />
                ) : (
                  <div className="w-14 h-14 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                    <Target className="w-6 h-6 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold truncate text-slate-900 dark:text-slate-100">{r.name}</h3>
                  <p className="text-xs text-muted-foreground truncate">{r.developer}</p>
                  <div className="flex gap-2 mt-1">
                    <span className="text-[10px] text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-sm">{r.category}</span>
                    <span className="text-[10px] text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-sm">{r.country}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-2">
                <Button size="sm" onClick={onRunAudit} className="flex-1 font-medium shadow-none rounded-md h-8 text-xs">
                  Run Full Audit
                </Button>
                <Button size="sm" variant="outline" onClick={onReset} className="px-4 shadow-none rounded-md h-8 text-xs">
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
          {isMounted && <TimestampBadge time={timestamp} label="Metadata fetched" color="blue" />}
        </div>
      );
    }

    if (ti.state === 'result' && ti.result?.error) {
      return (
        <div className="my-2">
          <div className="flex items-center gap-3 text-sm font-medium text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50 rounded-lg px-4 py-2.5 bg-red-50 dark:bg-red-950/20 shadow-sm max-w-sm">
            <span className="font-bold flex items-center justify-center w-5 h-5 rounded-full bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400">!</span>
            Failed to fetch metadata. Please check the URL.
          </div>
          {isMounted && <TimestampBadge time={timestamp} color="slate" />}
        </div>
      );
    }

    return (
      <div className="my-2">
        <div className="flex items-center gap-3 text-sm font-medium text-slate-600 dark:text-slate-400 border rounded-lg px-4 py-2.5 bg-slate-50 dark:bg-slate-900 shadow-sm max-w-sm">
          <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
          Fetching App Store metadata...
        </div>
        {isMounted && <TimestampBadge time={timestamp} color="blue" />}
      </div>
    );
  }

  if (ti.toolName === 'runASOAudit') {
    if (ti.state === 'result' && ti.result && !ti.result.error) {
      return (
        <div className="w-full my-6 flex flex-col items-center">
          <div className="w-full flex justify-end mb-4 print:hidden">
            <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-2 text-xs h-8">
              <Printer className="w-3.5 h-3.5" />
              Export to PDF
            </Button>
          </div>
          <div className="print-report-container w-full">
            <AuditDashboard audit={ti.result} appMetadata={appMetadata} />
            {isMounted && (
              <div className="mt-2 border-t border-slate-800/60 print:block">
                <TimestampBadge time={timestamp} label="Audit complete" color="purple" />
              </div>
            )}
          </div>
        </div>
      );
    }

    if (ti.state === 'result' && ti.result?.error) {
      return (
        <div className="w-full my-2">
          <div className="flex items-center gap-3 text-sm font-medium text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50 rounded-lg px-4 py-2.5 bg-red-50 dark:bg-red-950/20 shadow-sm max-w-sm mx-auto">
            <span className="font-bold flex items-center justify-center w-5 h-5 rounded-full bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400">!</span>
            Audit failed
          </div>
          <div className="flex justify-center mt-1">
            {isMounted && <TimestampBadge time={timestamp} color="slate" />}
          </div>
        </div>
      );
    }

    return (
      <div className="w-full my-2">
        <div className="flex items-center gap-3 text-sm font-medium text-slate-600 dark:text-slate-400 border rounded-lg px-4 py-2.5 bg-slate-50 dark:bg-slate-900 shadow-sm max-w-sm">
          <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
          Running 10-dimension ASO audit... (approx 20s)
        </div>
        {isMounted && <TimestampBadge time={timestamp} color="purple" />}
      </div>
    );
  }

  return null;
}
