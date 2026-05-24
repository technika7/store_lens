/**
 * ASO Audit Report Dashboard
 *
 * Renders the structured JSON returned by the `runASOAudit` tool as a
 * rich, interactive, and visually stunning dashboard with Chart.js visualization,
 * metrics breakdown, competitor benchmarking, and strategic insights.
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress, ProgressTrack, ProgressIndicator } from '@/components/ui/progress';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertTriangle, TrendingUp, Zap, Target, Award, Info, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip as ChartTooltip,
} from 'chart.js';
import { Radar } from 'react-chartjs-2';

ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  ChartTooltip
);

/* Types & Schemas */

interface ScoreCardItem {
  dimension: string;
  score: number;
  reason: string;
}

interface CompetitorRow {
  metric: string;
  app: string;
  competitor1: string;
  competitor2: string;
  competitor3: string;
}

interface AuditResult {
  scoreCard: ScoreCardItem[];
  overallScore: number;
  quickWins: string[];
  highImpactChanges: string[];
  strategicRecommendations: string[];
  competitorNames?: string[];
  competitorComparison: CompetitorRow[];
}

/* Core Utility Helpers */

function scoreTextClass(score: number) {
  if (score >= 8) return 'text-emerald-500';
  if (score >= 5) return 'text-amber-500';
  return 'text-rose-500';
}

function scoreProgressClass(score: number) {
  if (score >= 8) return 'bg-emerald-500';
  if (score >= 5) return 'bg-amber-500';
  return 'bg-rose-500';
}

function overallLabel(score: number) {
  if (score >= 80)
    return { label: 'Excellent Health', icon: <CheckCircle2 className="w-4 h-4 mr-1.5" />, cls: 'bg-emerald-500/10 text-emerald-700 border-emerald-200 dark:text-emerald-400 dark:border-emerald-900' };
  if (score >= 50)
    return { label: 'Needs Improvement', icon: <AlertTriangle className="w-4 h-4 mr-1.5" />, cls: 'bg-amber-500/10 text-amber-700 border-amber-200 dark:text-amber-400 dark:border-amber-900' };
  return { label: 'Critical Issues', icon: <AlertTriangle className="w-4 h-4 mr-1.5" />, cls: 'bg-rose-500/10 text-rose-700 border-rose-200 dark:text-rose-400 dark:border-rose-900' };
}

function SemiCircleGauge({ score }: { score: number }) {
  const { label, icon, cls } = overallLabel(score);
  const radius = 70;
  const strokeWidth = 14;
  const circumference = Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-48 h-28 overflow-hidden flex justify-center mt-2">
        <svg className="w-48 h-48 absolute top-0" viewBox="0 0 160 160">
          <defs>
            <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="50%" stopColor="#eab308" />
              <stop offset="100%" stopColor="#22c55e" />
            </linearGradient>
          </defs>
          <path
            d="M 10 80 A 70 70 0 0 1 150 80"
            fill="none"
            stroke="var(--color-slate-100, #f1f5f9)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            className="dark:stroke-slate-800"
          />
          <path
            d="M 10 80 A 70 70 0 0 1 150 80"
            fill="none"
            stroke="url(#gaugeGradient)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute bottom-4 flex flex-col items-center justify-end w-full">
          <div className="flex items-baseline justify-center gap-1">
            <span className="text-5xl font-bold tabular-nums tracking-tighter text-slate-800 dark:text-white leading-none">{score}</span>
            <span className="text-xl font-medium text-slate-400">/100</span>
          </div>
        </div>
      </div>
      <Badge variant="outline" className={cn('flex items-center text-sm px-3 py-1 font-semibold rounded-full mt-4', cls)}>
        {icon}{label}
      </Badge>
    </div>
  );
}



export function AuditDashboard({ audit, appMetadata }: { audit: AuditResult; appMetadata?: any }) {
  // Extract short dimensions for the overview chart
  const overviewData = audit.scoreCard.map(item => ({
    dimension: item.dimension.split(' ')[0],
    score: item.score,
  }));

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700 pb-20">

      {/* ── Dashboard Header ─── */}
      <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">ASO Health Report</h1>
          <p className="text-muted-foreground mt-1">Actionable insights to boost your organic reach.</p>
        </div>
        {appMetadata && (
          <div className="flex items-center gap-3 bg-slate-900/60 p-2 pl-3 pr-4 rounded-full border border-slate-800 shadow-sm">
            {appMetadata.icon ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={appMetadata.icon} alt={appMetadata.name} className="w-10 h-10 rounded-full object-cover shadow-sm ring-1 ring-white/10" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center">
                <Target className="w-5 h-5 text-slate-400" />
              </div>
            )}
            <div className="flex flex-col">
              <span className="font-bold text-sm leading-none max-w-[200px] truncate text-white">{appMetadata.name}</span>
              <span className="text-xs text-slate-400 mt-0.5 truncate">{appMetadata.developer}</span>
            </div>
          </div>
        )}
      </div>

      {/* ── Top Section: Score & Radar ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Overall Score */}
        <Card className="rounded-2xl border border-slate-100 dark:border-slate-800/80 shadow-md shadow-slate-100/50 dark:shadow-none lg:col-span-1 flex flex-col justify-center items-center p-8 bg-white dark:bg-slate-900">
          <h2 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-2 self-start w-full text-center">ASO Content Score</h2>
          <SemiCircleGauge score={audit.overallScore} />
        </Card>

        {/* Dimension Overview Chart */}
        <Card className="rounded-2xl border border-slate-100 dark:border-slate-800/80 shadow-md shadow-slate-100/50 dark:shadow-none lg:col-span-2 p-6 flex flex-col items-center bg-white dark:bg-slate-900">
          <CardHeader className="p-0 mb-6 w-full">
            <CardTitle className="text-lg flex items-center gap-2 text-slate-800 dark:text-slate-200">
              <BarChart3 className="w-5 h-5 text-primary" />
              Dimension Balance
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex-1 flex w-full justify-center min-h-[300px]">
            <div className="w-full max-w-[450px]">
              <Radar
                data={{
                  labels: overviewData.map(d => d.dimension),
                  datasets: [
                    {
                      label: 'Score',
                      data: overviewData.map(d => d.score),
                      backgroundColor: 'rgba(124, 58, 237, 0.2)',
                      borderColor: 'rgba(124, 58, 237, 1)',
                      pointBackgroundColor: 'rgba(124, 58, 237, 1)',
                      pointBorderColor: '#fff',
                      pointHoverBackgroundColor: '#fff',
                      pointHoverBorderColor: 'rgba(124, 58, 237, 1)',
                      borderWidth: 2,
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: {
                    r: {
                      min: 0,
                      max: 10,
                      angleLines: {
                        color: 'rgba(156, 163, 175, 0.2)',
                      },
                      grid: {
                        color: 'rgba(156, 163, 175, 0.2)',
                      },
                      pointLabels: {
                        color: 'rgba(107, 114, 128, 1)',
                        font: {
                          size: 11,
                          weight: 'bold'
                        }
                      },
                      ticks: {
                        stepSize: 2,
                        display: false,
                      }
                    }
                  },
                  plugins: {
                    legend: {
                      display: false,
                    },
                    tooltip: {
                      backgroundColor: 'rgba(15, 23, 42, 0.9)',
                      titleFont: { size: 13, weight: 'bold' },
                      bodyFont: { size: 13, weight: 'bold' },
                      padding: 12,
                      cornerRadius: 8,
                      displayColors: false,
                      callbacks: {
                        label: function (context) {
                          return `Score: ${context.raw}/10`;
                        }
                      }
                    }
                  }
                }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ── Action Plan (Quick Wins + High Impact) ─── */}
        <div className="space-y-6">
          <Card className="rounded-2xl border border-slate-100 dark:border-slate-800/80 shadow-md shadow-slate-100/50 dark:shadow-none bg-white dark:bg-slate-900 overflow-hidden p-0 gap-0">
            <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 pt-4 pb-4 px-4 border-b border-slate-100 dark:border-slate-800/60">
              <CardTitle className="flex items-center justify-between text-slate-800 dark:text-slate-200 text-lg">
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-emerald-500" />
                  Quick Wins
                </div>
                <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 border-0">{audit.quickWins.length} pending</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 px-4 pb-4">
              <div className="flex flex-wrap gap-2">
                {audit.quickWins.map((win, i) => (
                  <div key={i} className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-900 dark:text-emerald-100 px-3 py-2 rounded-lg border border-emerald-200 dark:border-emerald-800 text-xs font-semibold leading-tight max-w-full">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span className="truncate">{win}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border border-slate-100 dark:border-slate-800/80 shadow-md shadow-slate-100/50 dark:shadow-none bg-white dark:bg-slate-900 overflow-hidden p-0 gap-0">
            <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 pt-4 pb-4 px-4 border-b border-slate-100 dark:border-slate-800/60">
              <CardTitle className="flex items-center justify-between text-slate-800 dark:text-slate-200 text-lg">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-amber-500" />
                  High-Impact Changes
                </div>
                <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 border-0">{audit.highImpactChanges.length} identified</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 px-4 pb-4">
              <div className="flex flex-col gap-2">
                {audit.highImpactChanges.map((change, i) => (
                  <div key={i} className="flex items-start gap-2.5 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-100 dark:border-slate-700/50">
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <span className="text-sm font-medium leading-relaxed text-slate-700 dark:text-slate-300">{change}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Dimension Breakdown List ─── */}
        <Card className="rounded-2xl border border-slate-100 dark:border-slate-800/80 shadow-md shadow-slate-100/50 dark:shadow-none bg-white dark:bg-slate-900 overflow-hidden p-0 gap-0">
          <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 pt-4 pb-4 px-4 border-b border-slate-100 dark:border-slate-800/60">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Info className="w-5 h-5 text-primary" />
              Detailed Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 divide-y">
            {audit.scoreCard.map((item, i) => (
              <div key={i} className="p-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{item.dimension}</span>
                  <Badge variant="outline" className={cn('font-bold', scoreTextClass(item.score))}>{item.score}/10</Badge>
                </div>
                <Progress value={item.score * 10} className="h-1.5 mb-3 bg-slate-100 dark:bg-slate-800">
                  <ProgressTrack className="bg-transparent">
                    <ProgressIndicator className={cn(scoreProgressClass(item.score))} />
                  </ProgressTrack>
                </Progress>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{item.reason}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* ── Competitor Comparison ─── */}
      <Card className="rounded-2xl border border-slate-100 dark:border-slate-800/80 shadow-md shadow-slate-100/50 dark:shadow-none bg-white dark:bg-slate-900 overflow-hidden p-0 gap-0">
        <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 pt-4 pb-4 px-4 border-b border-slate-100 dark:border-slate-800/60">
          <CardTitle className="text-lg flex items-center gap-2">
            <Award className="w-5 h-5 text-primary" />
            Competitor Benchmarks
          </CardTitle>
          <CardDescription>How you stack up against top category leaders.</CardDescription>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/50 dark:bg-slate-800/50 border-b">
                <TableHead className="font-semibold text-slate-900 dark:text-slate-100 w-[200px] h-12 px-4">Metric</TableHead>
                <TableHead className="font-bold text-primary bg-primary/5 h-12 px-4">{appMetadata?.name || 'This App'}</TableHead>
                <TableHead className="text-slate-500 h-12 px-4">{audit.competitorNames?.[0] || 'Competitor 1'}</TableHead>
                <TableHead className="text-slate-500 h-12 px-4">{audit.competitorNames?.[1] || 'Competitor 2'}</TableHead>
                <TableHead className="text-slate-500 h-12 px-4">{audit.competitorNames?.[2] || 'Competitor 3'}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {audit.competitorComparison.map((row: any, i) => (
                <TableRow key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <TableCell className="font-medium text-sm border-r px-4 py-3">{row.metric}</TableCell>
                  <TableCell className="font-semibold text-sm bg-primary/5 border-r px-4 py-3">{row.thisAppValue}</TableCell>
                  <TableCell className="text-sm text-muted-foreground border-r px-4 py-3">{row.competitor1}</TableCell>
                  <TableCell className="text-sm text-muted-foreground border-r px-4 py-3">{row.competitor2}</TableCell>
                  <TableCell className="text-sm text-muted-foreground px-4 py-3">{row.competitor3}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ── Strategic Recommendations ─── */}
      <Accordion className="rounded-2xl border border-slate-100 dark:border-slate-800/80 shadow-md shadow-slate-100/50 dark:shadow-none bg-white dark:bg-slate-900 px-6">
        <AccordionItem value="strategy" className="border-0">
          <AccordionTrigger className="text-lg font-bold py-6 hover:no-underline">
            Long-term Strategic Recommendations
          </AccordionTrigger>
          <AccordionContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-6">
              {audit.strategicRecommendations.map((rec, i) => (
                <div key={i} className="flex gap-4 bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold shrink-0 shadow-sm">
                    {i + 1}
                  </div>
                  <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300 font-medium">{rec}</p>
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

    </div>
  );
}
