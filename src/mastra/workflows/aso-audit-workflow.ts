import { createWorkflow, createStep } from '@mastra/core/workflows';
import { z } from 'zod';
import { fetchAppMetadata } from '../tools/fetch-app-metadata';
import { runASOAudit, ASOAuditSchema, ASOAuditResult } from '../tools/run-aso-audit';

/**
 * Step 1: Discover & Verify Metadata
 *
 * Connects to the App Store scraper and returns raw metadata
 * to confirm the app listing before launching the deep audit.
 */
const fetchMetadataStep = createStep({
  id: 'fetchMetadataStep',
  inputSchema: z.object({
    url: z.string().url('Must be a valid Apple App Store URL'),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    url: z.string().url(),
    data: z.any().optional(),
    error: z.string().optional(),
  }),
  execute: async ({ inputData }) => {
    try {
      if (!fetchAppMetadata.execute) {
        throw new Error('fetchAppMetadata tool execute method is undefined');
      }
      const data = await fetchAppMetadata.execute({ url: inputData.url }, {} as any);
      return { success: true, url: inputData.url, data };
    } catch (e: any) {
      return { success: false, url: inputData.url, error: e?.message || 'Failed to fetch metadata' };
    }
  },
});

/**
 * Step 2: Run Deep 10-Dimension ASO Audit
 *
 * Runs the structured LLM reasoning engine to grade the app metadata,
 * compile before/after recommendations, and compute competitor tables.
 */
const runAuditStep = createStep({
  id: 'runAuditStep',
  inputSchema: z.object({
    success: z.boolean(),
    url: z.string().url(),
    data: z.any().optional(),
    error: z.string().optional(),
  }),
  outputSchema: ASOAuditSchema,
  execute: async ({ inputData }): Promise<ASOAuditResult> => {
    if (!runASOAudit.execute) {
      throw new Error('runASOAudit tool execute method is undefined');
    }
    const result = await runASOAudit.execute({ url: inputData.url }, {} as any);
    return result as ASOAuditResult;
  },
});

/**
 * ASO Audit Workflow
 *
 * A multi-step workflow orchestrating discovery metadata scraping
 * followed by the deep analytical ASO grading reasoning loop.
 */
export const asoAuditWorkflow = createWorkflow({
  id: 'aso-audit-workflow',
  inputSchema: z.object({
    url: z.string().url('Must be a valid Apple App Store URL'),
  }),
  outputSchema: ASOAuditSchema,
})
  .then(fetchMetadataStep)
  .then(runAuditStep);
