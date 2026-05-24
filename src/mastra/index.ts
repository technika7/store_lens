/**
 * Mastra instance – the application's central orchestration layer.
 *
 * We keep the configuration lean: the asoAgent is registered here
 * together with a LibSQL-backed storage (SQLite on disk) for
 * conversation memory and thread persistence.
 */
import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';
import { LibSQLStore } from '@mastra/libsql';
import { asoAgent } from './agents/aso-agent';
import { asoAuditWorkflow } from './workflows/aso-audit-workflow';

export const mastra = new Mastra({
  agents: { asoAgent },
  workflows: { asoAuditWorkflow },
  storage: new LibSQLStore({
    id: 'mastra-storage',
    // File-based SQLite – zero-config for local development
    url: 'file:./mastra.db',
  }),
  logger: new PinoLogger({
    name: 'Mastra',
    level: 'info',
  }),
});
