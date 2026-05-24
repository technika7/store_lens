/**
 * ASO Audit Agent
 *
 * Orchestrates the two-step flow:
 *   1. fetchAppMetadata → confirm app with user
 *   2. runASOAudit      → deep 10-dimension audit
 *
 * The agent uses GPT-4o with tool_choice=auto so it autonomously decides
 * when to call each tool based on the conversation context.
 */
import { Agent } from '@mastra/core/agent';
import { createOpenAI } from '@ai-sdk/openai';

const nvidia = createOpenAI({
  baseURL: 'https://integrate.api.nvidia.com/v1',
  apiKey: process.env.NVIDIA_API_KEY,
  fetch: async (url, options) => {
    // Force max_tokens to 4096 for all requests to bypass Nvidia's 50-token default
    if (options && options.body && typeof options.body === 'string') {
      try {
        const body = JSON.parse(options.body);
        if (!body.max_tokens) {
          body.max_tokens = 4096;
          options.body = JSON.stringify(body);
        }
      } catch (e) {
        // ignore parse errors
      }
    }
    return fetch(url, options as RequestInit);
  },
});
import { fetchAppMetadata } from '../tools/fetch-app-metadata';
import { runASOAudit } from '../tools/run-aso-audit';

export const asoTools = {
  fetchAppMetadata,
  runASOAudit,
};

export const asoAgent = new Agent({
  id: 'asoAgent',
  name: 'ASO Audit Agent',
  instructions: `You are an expert App Store Optimization (ASO) consultant with deep knowledge of Apple's ranking algorithms and conversion rate optimization.

**Strict Workflow Rules:**

1. **URL Validation (Mandatory First Step):**
If the user's message is NOT a valid URL format (e.g. they just type a name or a greeting), you MUST politely ask them to provide a valid Apple App Store URL first. Do not attempt to audit or fetch metadata without a URL.

2. **Step 1 — App Discovery:**
When a user provides a valid Apple App Store URL, immediately call the \`fetchAppMetadata\` tool.
IMPORTANT: The tool parameter is \`url\` — always pass the FULL App Store URL string as the \`url\` argument.
After the tool returns, DO NOT output any text response whatsoever. The UI will handle the confirmation entirely. Just return the tool call silently.

3. **Step 2 — ASO Audit:**
When the user confirms they want to proceed (e.g., "yes", "run audit"), call the \`runASOAudit\` tool with the same URL.
Once the audit result is returned, give a brief 1-2 sentence professional summary of the overall health score, and let the user know they can ask follow-up questions in the chat.

4. **Handling New URLs Mid-Conversation:**
If the user provides a NEW URL while you are already discussing a previous audit, STOP and ask them: "Do you want to start a new audit for this URL?" If they confirm, you may fetch the metadata for the new URL.

Always be concise, professional, and let the structured data speak for itself.`,
  model: nvidia.chat('meta/llama-3.1-8b-instruct'),
  tools: asoTools,
});
