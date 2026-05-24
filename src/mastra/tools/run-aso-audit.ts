/**
 * runASOAudit Tool
 *
 * Performs a comprehensive 10-dimension ASO health audit on an Apple App
 * Store URL. Uses `generateObject` to enforce a typed JSON output schema,
 * which is then rendered by the frontend's AuditDashboard component.
 *
 * Dimensions analysed:
 *   1. Title             6. App Preview Video
 *   2. Subtitle          7. Ratings & Reviews
 *   3. Keyword Field     8. Icon
 *   4. Description       9. Conversion Signals
 *   5. Screenshots      10. Competitive Position
 *
 * PERFORMANCE NOTES:
 *   - Uses llama-3.1-8b-instruct (8B params) instead of 70B — ~5-8x faster
 *     for structured output while still producing quality audit results.
 *   - Uses providerOptions.nvidia.guided_json to enable xgrammar backend,
 *     which is NVIDIA's fastest structured decoding method.
 *   - Added per-phase timing logs to pinpoint slowdowns.
 */
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { fetchAppStoreData } from '../scraper';
import { generateObject } from 'ai';
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

// Use the smaller, faster 8B model for structured generation.
// The 70B model takes 90-120s for generateObject; 8B takes ~10-20s.
const AUDIT_MODEL = nvidia.chat('meta/llama-3.1-8b-instruct');

function ts() {
  return new Date().toISOString().replace('T', ' ').slice(0, -1);
}
function auditLog(phase: string, msg: string) {
  console.log(`[${ts()}] [AUDIT/${phase}] ${msg}`);
}

// ─── Output Schema ─────────────────────────────────────────────────────────────

const ScoreCardItemSchema = z.object({
  dimension: z.string().describe('ASO dimension name'),
  score: z.number().min(0).max(10).describe('Score from 0 (critical) to 10 (excellent)'),
  reason: z.string().describe('Evidence-based justification for the score, citing specific metadata'),
});

const CompetitorRowSchema = z.object({
  metric: z.string().describe('Metric being compared'),
  thisAppValue: z.string().describe('Actual value of this metric for the audited app'),
  competitor1: z.string().describe('Estimated value for competitor 1'),
  competitor2: z.string().describe('Estimated value for competitor 2'),
  competitor3: z.string().describe('Estimated value for competitor 3'),
});

export const ASOGenerationSchema = z.object({
  competitorNames: z.array(z.string()).length(3).describe('Names of 3 DISTINCT real-world competing apps. DO NOT include the audited app itself here.'),
  scoreCard: z.array(ScoreCardItemSchema).length(10).describe('Exactly 10 dimension scores'),
  quickWins: z.array(z.string()).min(3).max(6).describe(
    'Quick wins: changes achievable within 1 day. Include before→after examples for text changes.',
  ),
  highImpactChanges: z.array(z.string()).min(3).max(6).describe(
    'High-impact changes needing 1–2 weeks. Describe specific improvement with evidence.',
  ),
  strategicRecommendations: z.array(z.string()).min(3).max(5).describe(
    'Long-term (1–3 month) strategic initiatives for sustained ASO improvement.',
  ),
  competitorComparison: z.array(CompetitorRowSchema).min(4).max(8).describe(
    'Side-by-side comparison table of key ASO signals vs 3 top category competitors.',
  ),
});

export const ASOAuditSchema = ASOGenerationSchema.extend({
  overallScore: z.number().min(0).max(100).describe('Weighted overall ASO health score (0–100)'),
});

export type ASOAuditResult = z.infer<typeof ASOAuditSchema>;

// ─── Tool Definition ───────────────────────────────────────────────────────────

export const runASOAudit = createTool({
  id: 'runASOAudit',
  description:
    'Performs a comprehensive App Store Optimization audit for a given App Store URL. ' +
    'Only call this after the user has confirmed the app identity.',
  inputSchema: z.object({
    url: z.string().url('Must be a valid Apple App Store URL'),
  }),
  outputSchema: ASOAuditSchema,

  execute: async ({ url }): Promise<ASOAuditResult> => {
    auditLog('START', `url=${url}`);

    // 1. Fetch the live App Store page
    const fetchStart = Date.now();
    const data = await fetchAppStoreData(url);
    auditLog('FETCH', `done in ${((Date.now() - fetchStart) / 1000).toFixed(1)}s`);

    if (!data) {
      throw new Error(
        'Could not fetch the App Store page. Please verify the URL is a valid Apple App Store listing.',
      );
    }

    // 2. Build a concise context string — keep it short to minimise tokens
    const appContext = [
      `App Name: ${data.name}`,
      `Developer: ${data.developer}`,
      `Subtitle: ${data.subtitle || '(none)'}`,
      `Category: ${data.category}`,
      `Rating: ${data.ratings.average} avg (${data.ratings.count} ratings)`,
      `Screenshots: ${data.screenshots.length}/10 slots used`,
      `Description preview:\n${data.description.slice(0, 500)}`,
    ].join('\n');

    // 3. Generate a structured audit using the faster 8B model with guided_json
    auditLog('LLM', `Calling generateObject with model=llama-3.1-8b-instruct…`);
    const llmStart = Date.now();

    const { object } = await generateObject({
      model: AUDIT_MODEL,
      schema: ASOGenerationSchema,
      // providerOptions.nvidia.guided_json enables xgrammar — fastest structured decoding.
      // Must pass a plain JSON Schema object, not the Zod schema directly.
      providerOptions: {
        nvidia: {
          guided_json: {
            type: 'object',
            properties: {
              competitorNames: { type: 'array', items: { type: 'string' } },
              scoreCard: { type: 'array', items: { type: 'object', properties: { dimension: { type: 'string' }, score: { type: 'number' }, reason: { type: 'string' } }, required: ['dimension', 'score', 'reason'] } },
              quickWins: { type: 'array', items: { type: 'string' } },
              highImpactChanges: { type: 'array', items: { type: 'string' } },
              strategicRecommendations: { type: 'array', items: { type: 'string' } },
              competitorComparison: { type: 'array', items: { type: 'object', properties: { metric: { type: 'string' }, thisAppValue: { type: 'string' }, competitor1: { type: 'string' }, competitor2: { type: 'string' }, competitor3: { type: 'string' } }, required: ['metric', 'thisAppValue', 'competitor1', 'competitor2', 'competitor3'] } },
            },
            required: ['competitorNames', 'scoreCard', 'quickWins', 'highImpactChanges', 'strategicRecommendations', 'competitorComparison'],
          },
        },
      },
      system: `You are an elite App Store Optimization (ASO) expert.
Conduct a 10-dimension ASO audit based on the scraped metadata.
Always be highly critical—score out of 10. A 10/10 requires absolute perfection.
Provide actionable quick wins and high-impact changes.

IMPORTANT COMPETITOR BENCHMARK RULES:
1. Identify exactly 3 real-world, highly relevant competing apps for the 'competitorNames' array.
2. DO NOT use the audited app as one of the competitors.
3. In the competitorComparison table, ensure columns competitor1, competitor2, and competitor3 map to the apps listed in 'competitorNames'.
4. For the 'competitorComparison' array, you MUST generate exactly 6 highly diverse metric comparison rows. Do NOT just include rating and review. You MUST include exactly the following rows:
   - "Estimated Downloads (Monthly)" (realistic estimates, e.g. "120K", "15K", "2.5M")
   - "Category Rank" (realistic category rankings, e.g. "#15 in Finance", "#8 in Productivity")
   - "Average Rating" (e.g. "4.7 (12K reviews)", "4.3 (450 reviews)")
   - "Keywords Optimization" (ASO optimized status, e.g. "Excellent (58 chars)", "Poor (none)")
   - "Screenshots Count" (number of screenshot slots used, e.g. "10 of 10 slots", "5 of 10 slots")
   - "App Preview Video" (preview video presence, e.g. "Yes (Portrait)", "No")
5. For the 'thisAppValue' column in competitorComparison, use the REAL metric values scraped from the audited app's metadata (e.g. actual rating, actual screenshot count, actual video presence). Do NOT write the name of the app.
6. For columns competitor1, competitor2, competitor3, you MUST always fill in realistic estimated values for EVERY row. Never leave them blank or use placeholder text.`,
      prompt: `Perform a rigorous ASO health audit for:

## App Data
${appContext}

## Instructions
Score each of the 10 ASO dimensions on a 0–10 scale using the rubric below. Cite specific evidence from the app data for every score. Be concise.

| # | Dimension | Key criteria |
|---|-----------|-------------|
| 1 | Title | ≤30 chars, primary keyword in first position, benefit-driven |
| 2 | Subtitle | ≤30 chars, complementary keywords, not repeating title |
| 3 | Keyword Field | Estimated keyword relevance, no duplicates |
| 4 | Description | Hook in first 3 lines, scannable bullets, keyword density |
| 5 | Screenshots | All 10 slots used, text overlay, lifestyle/feature shots |
| 6 | App Preview Video | Presence, first 3s hook, landscape/portrait coverage |
| 7 | Ratings & Reviews | Rating average, count, recency, developer responses |
| 8 | Icon | Memorability, clarity at small sizes, A/B test signals |
| 9 | Conversion Signals | Social proof, awards, press mentions in description |
| 10 | Competitive Position | Estimated rank vs top 3 competitors in category |

For Quick Wins, always include a concrete before → after example for text-based changes.
For competitor comparison, name real well-known competitor apps in the same category.

Return your complete analysis in the required JSON schema.`,
    });

    auditLog('LLM', `generateObject done in ${((Date.now() - llmStart) / 1000).toFixed(1)}s`);

    // Programmatically calculate the overallScore mathematically from individual dimension scores.
    // Each of the 10 scorecard items is graded out of 10, meaning a perfect score is exactly 100.
    // This is mathematically precise, fully deterministic, and completely removes LLM scaling mistakes.
    let totalScore = 0;
    const scoreCard = object.scoreCard.map(item => {
      let s = item.score;
      if (s > 10) {
        s = Math.round(s / 10);
      }
      s = Math.max(0, Math.min(10, s));
      totalScore += s;
      return {
        ...item,
        score: s,
      };
    });

    const calculatedOverallScore = Math.max(0, Math.min(100, Math.round(totalScore)));

    const finalResult: ASOAuditResult = {
      ...object,
      scoreCard,
      overallScore: calculatedOverallScore,
    };

    auditLog('DONE', `Total tool time: ${((Date.now() - fetchStart) / 1000).toFixed(1)}s`);

    return finalResult;
  },
});
