/**
 * fetchAppMetadata Tool
 *
 * Lightweight scrape to confirm the app identity before committing to a
 * full audit. Returns just enough for the agent to show the user a
 * confirmation card (icon, name, developer, category).
 */
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { fetchAppStoreData } from '../scraper';

export const fetchAppMetadata = createTool({
  id: 'fetchAppMetadata',
  description:
    'Fetches surface-level metadata for an Apple App Store URL. ' +
    'Call this to confirm the app with the user before running the audit.',
  inputSchema: z.object({
    url: z.string().url('Must be a valid Apple App Store URL'),
  }),
  outputSchema: z.object({
    name: z.string(),
    developer: z.string(),
    icon: z.string(),
    category: z.string(),
    country: z.string(),
    description: z.string(),
    url: z.string(),
  }),
  execute: async ({ url }) => {
    const data = await fetchAppStoreData(url);
    if (!data) {
      throw new Error(
        'Failed to fetch app metadata. Please verify the URL points to a valid Apple App Store listing.',
      );
    }
    return {
      name: data.name,
      developer: data.developer,
      icon: data.icon,
      category: data.category,
      country: data.country,
      description: data.description,
      url: data.url,
    };
  },
});
