/**
 * POST /api/chat
 *
 * Architecture: Two-pass streaming protocol optimized for NVIDIA LLama models.
 * 
 * 1. Pass 1 (Tool-Enabled):
 *    Executes the conversational loop allowing the agent to fetch metadata or 
 *    execute full ASO audits as generative UI elements.
 * 
 * 2. Pass 2 (Conversational Continuation):
 *    If the model executes tool calls in Pass 1, we immediately transition to Pass 2 
 *    in the same HTTP request to stream a concluding textual summary to the user.
 * 
 * Context Optimization:
 *    LLM TTFT degrades heavily with input context length. Tool outputs can be large 
 *    JSON blobs. We summarize tool outputs to a single compact line in the chat history, 
 *    as the UI holds the actual rich state. This minimizes history token weight,
 *    improving response speed and reducing context thrashing.
 */

import {
  streamText,
  createUIMessageStream,
  createUIMessageStreamResponse,
  stepCountIs,
  UIMessage,
} from 'ai';
import { asoAgent, asoTools } from '@/mastra/agents/aso-agent';
import { NextRequest, NextResponse } from 'next/server';
import { createOpenAI } from '@ai-sdk/openai';

const nvidia = createOpenAI({
  baseURL: 'https://integrate.api.nvidia.com/v1',
  apiKey: process.env.NVIDIA_API_KEY,
  fetch: async (url, options) => {
    // Interceptor overrides max_tokens to 4096 to prevent default model generation truncation
    if (options && options.body) {
      try {
        let bodyStr = '';
        if (options.body instanceof Uint8Array || Buffer.isBuffer(options.body)) {
          bodyStr = new TextDecoder().decode(options.body as any);
        } else if (typeof options.body === 'string') {
          bodyStr = options.body;
        }

        if (bodyStr) {
          const body = JSON.parse(bodyStr);
          if (!body.max_tokens || body.max_tokens < 4096) {
            body.max_tokens = 4096;
            options.body = JSON.stringify(body);
          }
        }
      } catch (e) {
        // Silent failure to ensure request execution is not interrupted
      }
    }
    return fetch(url, options as RequestInit);
  },
});

const routeModel = nvidia.chat('meta/llama-3.1-8b-instruct');

export const runtime = 'nodejs';

/**
 * Summarizes heavy tool outputs to keep context token count minimal.
 * The UI is responsible for rendering the rich dashboard structures.
 */
function summariseToolResult(toolName: string, output: any): string {
  if (!output || output.error) {
    return `${toolName} failed: ${output?.message ?? output?.error ?? 'unknown error'}`;
  }
  if (toolName === 'fetchAppMetadata') {
    return `fetchAppMetadata result: "${output.name}" by ${output.developer}, category=${output.category}, country=${output.country}`;
  }
  if (toolName === 'runASOAudit') {
    const overall = Array.isArray(output.scoreCard)
      ? Math.round(output.scoreCard.reduce((s: number, d: any) => s + (d.score ?? 0), 0) / output.scoreCard.length)
      : '?';
    const worst = Array.isArray(output.scoreCard)
      ? output.scoreCard.sort((a: any, b: any) => a.score - b.score).slice(0, 3).map((d: any) => `${d.dimension}(${d.score})`).join(', ')
      : '';

    const wins = (output.quickWins || []).slice(0, 3).join('; ');
    const highImpact = (output.highImpactChanges || []).slice(0, 3).join('; ');
    const strategic = (output.strategicRecommendations || []).slice(0, 2).join('; ');

    return `runASOAudit result: Score ≈ ${overall}/10. Weakest: ${worst}. Quick Wins: ${wins}. High Impact: ${highImpact}. Strategic: ${strategic}.`;
  }
  return `${toolName} completed. Keys: ${Object.keys(output ?? {}).join(', ')}`;
}

export async function POST(req: NextRequest) {
  if (!process.env.NVIDIA_API_KEY) {
    return NextResponse.json({ error: 'NVIDIA_API_KEY is not configured.' }, { status: 500 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  try {
    const rawMessages = (body.messages as UIMessage[]) || [];

    // Map UIMessage UI history schema to lean CoreMessage schema
    const cleanMessages = rawMessages
      .map((m: any) => {
        let contentText = m.content || '';

        if (m.parts && Array.isArray(m.parts)) {
          const texts = m.parts
            .filter((p: any) => p.type === 'text')
            .map((p: any) => p.text as string);

          const toolResults = m.parts
            .map((p: any) => {
              const isInvocation = p.type === 'tool-invocation' && p.toolInvocation;
              const ti = isInvocation ? p.toolInvocation : p;
              const isResultState = ti.state === 'result' || ti.state === 'output-available';
              const outputData = ti.result || ti.output;

              if ((ti.type?.startsWith('tool-') || isInvocation) && isResultState && outputData) {
                const toolName = ti.toolName || ti.type?.replace(/^tool-/, '') || 'unknown';
                return `[${summariseToolResult(toolName, outputData)}]`;
              }

              if (ti.type === 'tool-call' || (isInvocation && ti.state === 'call')) {
                const toolName = ti.toolName || 'unknown';
                return `[Called tool: ${toolName}]`;
              }

              return null;
            })
            .filter(Boolean);

          contentText = [...texts, ...toolResults].join('\n');
        }

        const role = m.role as string;
        
        if (role === 'assistant' && contentText) {
          const trimmed = contentText.trim();
          if (trimmed && !trimmed.endsWith('.') && !trimmed.endsWith('?') && !trimmed.endsWith('!') && !trimmed.endsWith('"') && !trimmed.endsWith(')')) {
            contentText = trimmed + '...';
          }
        }

        return { role: role as 'user' | 'assistant' | 'system', content: contentText || '(Tool Executed)' };
      })
      .filter((m: any) => m.role === 'user' || m.role === 'assistant' || m.role === 'system') as { role: 'user' | 'assistant' | 'system'; content: string }[];

    const baseSystemPrompt = await asoAgent.getInstructions();
    const systemPrompt = baseSystemPrompt + `

CRITICAL INSTRUCTION FOR TEXT GENERATION:
You MUST write complete, fully formed sentences and paragraphs. DO NOT truncate your responses or end mid-sentence. Always end your final response with a clear period, question mark, or proper closing punctuation. Ignore any truncated style or incomplete sentences in the chat history — you must output a complete, comprehensive, and professional response.`;

    // Map Mastra tools to AI SDK execution wrappers
    const aiTools: Record<string, any> = {};
    for (const [key, t] of Object.entries(asoTools)) {
      const tool = t as any;
      aiTools[key] = {
        description: tool.description || tool.id,
        parameters: tool.inputSchema,
        execute: async (args: any) => {
          try {
            return await tool.execute(args, { toolCallId: key, messages: cleanMessages });
          } catch (e: any) {
            return { error: e?.message ?? 'Tool execution failed' };
          }
        },
      };
    }

    const hasCompletedAudit = cleanMessages.some((m) => m.content?.includes('runASOAudit'));

    const uiStream = createUIMessageStream({
      execute: async ({ writer }) => {
        // Pass 1: Tool invocation & initial response
        const pass1 = streamText({
          model: routeModel as any,
          system: systemPrompt as string,
          tools: hasCompletedAudit ? undefined : aiTools,
          toolChoice: hasCompletedAudit ? 'none' : 'auto',
          stopWhen: stepCountIs(1),
          messages: cleanMessages,
        });

        for await (const chunk of pass1.toUIMessageStream()) {
          writer.write(chunk);
        }

        const pass1FinishReason = await pass1.finishReason;
        const pass1ToolResults = await pass1.toolResults;
        const pass1ToolCalls = await pass1.toolCalls;

        // Pass 2: Conversational text response if tools were executed in Pass 1
        if (pass1FinishReason === 'tool-calls' && (pass1ToolCalls?.length ?? 0) > 0) {
          const toolSummaries = (pass1ToolResults ?? []).map((tr: any) => {
            const output = tr?.output ?? tr?.result ?? tr;
            const toolName = tr?.toolName ?? 'unknown';
            return summariseToolResult(toolName, output);
          });

          const calledToolNames = pass1ToolCalls.map((tc: any) => tc.toolName).join(', ');
          const recentUserMessages = cleanMessages
            .filter((m) => m.role === 'user')
            .slice(-2);

          const pass2Messages = [
            ...recentUserMessages,
            {
              role: 'assistant' as const,
              content: `(Called: ${calledToolNames})`,
            },
            {
              role: 'user' as const,
              content:
                toolSummaries.join('\n') +
                '\n\nNow reply with a short conversational text message to the user. Do NOT call any tools.',
            },
          ];

          const pass2 = streamText({
            model: routeModel as any,
            system: systemPrompt as string,
            toolChoice: 'none',
            messages: pass2Messages,
          });

          for await (const chunk of pass2.toUIMessageStream()) {
            writer.write(chunk);
          }
        }
      },
    });

    return createUIMessageStreamResponse({ stream: uiStream });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'Internal agent error' }, { status: 500 });
  }
}
