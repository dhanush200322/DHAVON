import { Injectable, Logger } from '@nestjs/common';
import { ActiveMode } from '@dhavon/types';
import { AIMessage } from '../../providers/ai-provider.interface';
import { DHAVON_SYSTEM_PROMPT } from '../prompt/system-prompt';
import { ConversationService } from '../../conversation/conversation.service';
import { MemoryRetrievalService } from '../memory/memory-retrieval.service';
import { GoalsService } from '../goals/goals.service';
import { TasksService } from '../tasks/tasks.service';
import { McpGatewayService } from '../../mcp/mcp-gateway.service';

export interface ContextBuildOptions {
  userId?: string;
  conversationId: string;
  activeMode?: ActiveMode;
  userPrompt?: string;
}

export interface BuiltContext {
  systemInstruction: string;
  messages: AIMessage[];
}

@Injectable()
export class ContextBuilderService {
  private readonly logger = new Logger(ContextBuilderService.name);

  constructor(
    private readonly conversationService: ConversationService,
    private readonly memoryRetrieval: MemoryRetrievalService,
    private readonly goalsService: GoalsService,
    private readonly tasksService: TasksService,
    private readonly mcpGateway: McpGatewayService,
  ) {}

  async buildContext(options: ContextBuildOptions): Promise<BuiltContext> {
    const userId = options.userId || '00000000-0000-0000-0000-000000000001';
    const mode = options.activeMode || 'ask';

    // 1. Fetch relevant memories & preferences via bounded retrieval
    let retrievedMemoryContext = '';
    try {
      if (options.userPrompt) {
        const retrieval = await this.memoryRetrieval.retrieveBoundedContext(
          userId,
          options.userPrompt,
        );
        retrievedMemoryContext = retrieval.formattedContext;
      }
    } catch (err: unknown) {
      this.logger.debug(`Context memory recall skipped: ${err}`);
    }

    // 2. Fetch active goals & associated tasks
    let activeGoalSnippets: string[] = [];
    try {
      const goals = await this.goalsService.getGoals(userId);
      const activeGoals = goals
        .filter((g) => ['active', 'ACTIVE'].includes(String(g.status)))
        .slice(0, 2);

      for (const g of activeGoals) {
        const tasks = await this.tasksService.getTasks(g.id);
        const taskSummary = tasks
          .slice(0, 4)
          .map((t) => `  - [${t.status}] ${t.title}`)
          .join('\n');

        activeGoalSnippets.push(
          `Goal: ${g.title} (${g.progress}% complete)\nTasks:\n${taskSummary}`,
        );
      }
    } catch (err: unknown) {
      this.logger.debug(`Context goals recall skipped: ${err}`);
    }

    // 3. Available capability summary
    let capabilitiesSummary = '';
    try {
      const tools = this.mcpGateway.getTools();
      const serverNames = Array.from(new Set(tools.map((t) => t.serverName)));
      capabilitiesSummary = `Available External MCP Capabilities: ${serverNames.join(', ')} (${tools.length} discovered tools)`;
    } catch (err: unknown) {
      this.logger.debug(`Capabilities summary skipped: ${err}`);
    }

    // 4. Assemble dynamic system instruction
    const modeDirectives: Record<ActiveMode, string> = {
      ask: 'CURRENT FOCUS: In-depth conceptual reasoning, answering queries with strategic clarity and analytical precision.',
      plan: 'CURRENT FOCUS: Tactical planning, decomposing objectives into structured sequential milestones and dependencies.',
      create: 'CURRENT FOCUS: High-velocity creation, synthesizing production-grade code, architectures, and artifacts.',
      analyze: 'CURRENT FOCUS: Deep auditing, performance profiling, debugging, and system verification.',
    };

    const contextSections: string[] = [
      DHAVON_SYSTEM_PROMPT,
      `\n--- ACTIVE SYSTEM CONTEXT ---`,
      `Active Mode: ${mode.toUpperCase()}`,
      modeDirectives[mode] || modeDirectives.ask,
    ];

    if (capabilitiesSummary) {
      contextSections.push(capabilitiesSummary);
    }

    if (retrievedMemoryContext) {
      contextSections.push(`\n${retrievedMemoryContext}`);
    }

    if (activeGoalSnippets.length > 0) {
      contextSections.push(`\nACTIVE OBJECTIVES & TASKS:\n${activeGoalSnippets.join('\n\n')}`);
    }

    const systemInstruction = contextSections.join('\n');

    // 5. Retrieve recent message history
    const history = await this.conversationService.prepareAIContext(
      options.conversationId,
      12,
    );

    return {
      systemInstruction,
      messages: history,
    };
  }
}
