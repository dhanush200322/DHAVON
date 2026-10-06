import { Injectable, Logger } from '@nestjs/common';
import { McpTool } from '@dhavon/mcp';
import { McpRegistryService } from './mcp-registry.service';

export interface SelectedToolCandidate {
  tool: McpTool;
  suggestedArgs: Record<string, unknown>;
  confidence: number;
  reason: string;
}

@Injectable()
export class McpToolSelectorService {
  private readonly logger = new Logger(McpToolSelectorService.name);

  constructor(private readonly registry: McpRegistryService) {}

  /**
   * Deterministically analyze user request intent and select the appropriate MCP tool candidate
   */
  selectToolForIntent(userQuery: string): SelectedToolCandidate | null {
    const q = userQuery.toLowerCase();

    // 1. GitHub Repository inspection / search intent
    if (
      /\b(github|repo|repos|repository|repositories)\b/i.test(q) &&
      (q.includes('check') ||
        q.includes('list') ||
        q.includes('search') ||
        q.includes('my') ||
        q.includes('retrieve') ||
        q.includes('fetch') ||
        q.includes('activity') ||
        q.includes('inspect') ||
        q.includes('audit') ||
        q.includes('verify'))
    ) {
      const tool = this.registry.getToolByName('github-mcp-server', 'search_repositories');
      if (tool) {
        return {
          tool,
          suggestedArgs: { query: 'DHAVON' },
          confidence: 0.95,
          reason: 'User intent matches GitHub repository inspection capability.',
        };
      }
    }

    // 2. Postman API testing / workspace intent
    if (
      (q.includes('postman') || q.includes('api collection') || q.includes('workspace')) &&
      (q.includes('user') || q.includes('check') || q.includes('status') || q.includes('who') || q.includes('workspace'))
    ) {
      const tool = q.includes('workspace')
        ? this.registry.getToolByName('postman-mcp-server', 'getWorkspaces')
        : this.registry.getToolByName('postman-mcp-server', 'getAuthenticatedUser');

      if (tool) {
        return {
          tool,
          suggestedArgs: {},
          confidence: 0.95,
          reason: 'User intent matches Postman API platform capability.',
        };
      }
    }

    // 3. Supabase Database inspection intent
    if (
      (q.includes('supabase') || q.includes('database') || q.includes('table')) &&
      (q.includes('project') || q.includes('table') || q.includes('list') || q.includes('check'))
    ) {
      const tool = q.includes('table')
        ? this.registry.getToolByName('supabase', 'list_tables')
        : this.registry.getToolByName('supabase', 'list_projects');

      if (tool) {
        return {
          tool,
          suggestedArgs: { project_id: 'czhaiwpnyvynvqgjseyf', schemas: ['public'], verbose: false },
          confidence: 0.95,
          reason: 'User intent matches Supabase project and database capability.',
        };
      }
    }

    // 4. Render Cloud infrastructure intent
    if (
      (q.includes('render') || q.includes('cloud') || q.includes('deploy')) &&
      (q.includes('workspace') || q.includes('service') || q.includes('check'))
    ) {
      const tool = this.registry.getToolByName('render', 'list_workspaces');
      if (tool) {
        return {
          tool,
          suggestedArgs: {},
          confidence: 0.9,
          reason: 'User intent matches Render cloud infrastructure capability.',
        };
      }
    }

    // 5. Notion workspace intent
    if (
      q.includes('notion') &&
      (q.includes('user') || q.includes('workspace') || q.includes('page') || q.includes('check'))
    ) {
      const tool = this.registry.getToolByName('notion-mcp-server', 'API-get-self');
      if (tool) {
        return {
          tool,
          suggestedArgs: {},
          confidence: 0.9,
          reason: 'User intent matches Notion workspace inspection capability.',
        };
      }
    }

    return null;
  }

  /**
   * Find available tools that support a specific goal
   */
  findToolsForGoal(goalTitle: string): McpTool[] {
    return this.registry.findToolsByQuery(goalTitle);
  }
}
