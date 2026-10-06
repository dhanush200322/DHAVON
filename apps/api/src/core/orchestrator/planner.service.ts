import { Injectable, Logger } from '@nestjs/common';
import { GoalPlan, PlannedTask, RiskLevel } from '@dhavon/types';
import { AIProviderFactory } from '../../providers/provider.factory';
import { McpGatewayService } from '../../mcp/mcp-gateway.service';
import { DependencyService } from './dependency.service';
import { OrchestrationEventsService } from '../events/orchestration-events.service';

export interface PlanGoalRequest {
  goalId: string;
  title: string;
  description?: string;
  userId?: string;
}

@Injectable()
export class PlannerService {
  private readonly logger = new Logger(PlannerService.name);

  constructor(
    private readonly providerFactory: AIProviderFactory,
    private readonly mcpGateway: McpGatewayService,
    private readonly dependencyService: DependencyService,
    private readonly eventsService: OrchestrationEventsService,
  ) {}

  /**
   * Deterministic planning layer: Decomposes goal into ordered, dependency-checked tasks
   * with dynamically resolved MCP capabilities, estimated risk, and verification strategies.
   */
  async planGoal(request: PlanGoalRequest): Promise<GoalPlan> {
    this.logger.log(`Planning execution for goal: "${request.title}" (${request.goalId})`);

    // 1. Discover available capabilities from MCP Gateway
    const availableTools = this.mcpGateway.getTools();
    const serverNames: string[] = Array.from(new Set(availableTools.map((t) => t.serverName)));

    // 2. Synthesize task decomposition via AI provider with fallback
    let candidateTasks: PlannedTask[] = [];
    try {
      candidateTasks = await this.generateTasksViaAI(request, serverNames);
    } catch (err: unknown) {
      this.logger.warn(`AI planning failed (${err}), engaging deterministic fallback decomposition.`);
      candidateTasks = this.generateDeterministicTasks(request, serverNames);
    }

    // 3. Strictly validate AI plan — NEVER blindly trust AI-generated plans
    if (!candidateTasks || candidateTasks.length === 0) {
      candidateTasks = this.generateDeterministicTasks(request, serverNames);
    }

    // Cap tasks per goal for autonomy safety
    if (candidateTasks.length > 20) {
      candidateTasks = candidateTasks.slice(0, 20);
    }

    // 4. Validate DAG dependencies
    const mockTasks = candidateTasks.map((t, idx) => ({
      id: `task-${idx + 1}`,
      goalId: request.goalId,
      title: t.title,
      description: t.description,
      status: 'pending' as const,
      dependencies: t.dependencies,
      executionOrder: t.executionOrder,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

    const graphValidation = this.dependencyService.validateGraph(mockTasks);
    if (!graphValidation.valid) {
      this.logger.warn(
        `AI plan failed DAG validation: ${graphValidation.errorMessage}. Resolving linear order.`,
      );
      // Linearize dependencies to guarantee clean DAG
      candidateTasks.forEach((t, idx) => {
        t.dependencies = idx > 0 ? [candidateTasks[idx - 1].title] : [];
        t.executionOrder = idx + 1;
      });
    }

    // 5. MCP Capability assignment & dynamic tool matching
    const requiredCapabilities = new Set<string>();
    let highestRisk: RiskLevel = 'READ';

    for (const task of candidateTasks) {
      const candidate = this.mcpGateway.resolveCandidateForQuery(
        `${task.title} ${task.description}`,
      );

      if (candidate) {
        task.assignedCapability = candidate.tool.serverName;
        requiredCapabilities.add(candidate.tool.serverName);
        task.estimatedRisk = candidate.tool.riskLevel;
      } else {
        task.assignedCapability = this.inferCapability(task.title);
        if (task.assignedCapability) {
          requiredCapabilities.add(task.assignedCapability);
        }
        task.estimatedRisk = this.estimateTaskRisk(task.title);
      }

      if (!task.verificationStrategy) {
        task.verificationStrategy = `verify_${task.assignedCapability || 'output'}_payload`;
      }

      if (this.riskPrecedence(task.estimatedRisk) > this.riskPrecedence(highestRisk)) {
        highestRisk = task.estimatedRisk;
      }
    }

    const plan: GoalPlan = {
      goalId: request.goalId,
      title: request.title,
      description: request.description || '',
      tasks: candidateTasks,
      estimatedTotalRisk: highestRisk,
      requiredCapabilities: Array.from(requiredCapabilities),
      createdAt: new Date().toISOString(),
    };

    this.logger.log(
      `Plan generated: ${plan.tasks.length} tasks across capabilities [${plan.requiredCapabilities.join(', ')}] with risk [${plan.estimatedTotalRisk}]`,
    );

    this.eventsService.emitGoalPlanned(plan);
    return plan;
  }

  private async generateTasksViaAI(
    request: PlanGoalRequest,
    serverNames: string[],
  ): Promise<PlannedTask[]> {
    const provider = this.providerFactory.getActiveProvider();
    const prompt = `Decompose this user objective into a precise, ordered sequence of 2 to 5 tasks:
Goal: "${request.title}"
Description: "${request.description || 'None provided'}"
Available Capability Servers: ${serverNames.join(', ')}

Return ONLY valid JSON in this exact structure:
[
  {
    "title": "Short descriptive task title",
    "description": "Details of what this task accomplishes",
    "dependencies": [], // array of prerequisite task titles, or empty for first task
    "assignedCapability": "server-name or null",
    "verificationStrategy": "how to verify output"
  }
]`;

    const response = await provider.generate([
      {
        role: 'system',
        content:
          'You are the DHAVON Core Tactical Planner. Decompose goals into safe, ordered, verifiable steps. Return strictly valid JSON.',
      },
      { role: 'user', content: prompt },
    ]);

    const jsonMatch = response.content.match(/\[\s*\{[\s\S]*\}\s*\]/);
    if (!jsonMatch) {
      throw new Error('AI output did not contain valid JSON array');
    }

    const parsed = JSON.parse(jsonMatch[0]) as Array<{
      title: string;
      description?: string;
      dependencies?: string[];
      assignedCapability?: string;
      verificationStrategy?: string;
    }>;

    return parsed.map((item, idx) => ({
      title: item.title,
      description: item.description || item.title,
      dependencies: Array.isArray(item.dependencies) ? item.dependencies : [],
      assignedCapability: item.assignedCapability,
      estimatedRisk: this.estimateTaskRisk(item.title),
      verificationStrategy:
        item.verificationStrategy || `verify_${item.title.toLowerCase().replace(/\s+/g, '_')}`,
      executionOrder: idx + 1,
    }));
  }

  private generateDeterministicTasks(
    request: PlanGoalRequest,
    serverNames: string[],
  ): PlannedTask[] {
    const lower = `${request.title} ${request.description || ''}`.toLowerCase();

    // Pattern 1: GitHub repository analysis / inspection
    if (lower.includes('github') || lower.includes('repo')) {
      return [
        {
          title: 'Retrieve GitHub Repositories',
          description: 'Fetch repositories and inspect active branches/commits via GitHub MCP',
          dependencies: [],
          assignedCapability: 'github-mcp-server',
          estimatedRisk: 'READ',
          verificationStrategy: 'inspect_repositories_payload',
          executionOrder: 1,
        },
        {
          title: 'Analyze Repository Activity',
          description: 'Audit repository activity, commits, and project structure',
          dependencies: ['Retrieve GitHub Repositories'],
          assignedCapability: 'github-mcp-server',
          estimatedRisk: 'READ',
          verificationStrategy: 'validate_activity_analysis',
          executionOrder: 2,
        },
        {
          title: 'Synthesize Project Summary',
          description: 'Synthesize actionable development summary for active projects',
          dependencies: ['Analyze Repository Activity'],
          assignedCapability: undefined,
          estimatedRisk: 'LOW_RISK',
          verificationStrategy: 'validate_non_empty_output_integrity',
          executionOrder: 3,
        },
        {
          title: 'Verify Source Data Consistency',
          description: 'Perform source validation against external records',
          dependencies: ['Synthesize Project Summary'],
          assignedCapability: 'github-mcp-server',
          estimatedRisk: 'READ',
          verificationStrategy: 'verify_source_data',
          executionOrder: 4,
        },
      ];
    }

    // Pattern 2: Database / Supabase inspection
    if (lower.includes('database') || lower.includes('supabase') || lower.includes('table')) {
      return [
        {
          title: 'Inspect Database Schema',
          description: 'Query database tables and schemas via Supabase MCP',
          dependencies: [],
          assignedCapability: 'supabase',
          estimatedRisk: 'READ',
          verificationStrategy: 'read_record_back',
          executionOrder: 1,
        },
        {
          title: 'Audit System Records',
          description: 'Verify table constraints and data consistency',
          dependencies: ['Inspect Database Schema'],
          assignedCapability: 'supabase',
          estimatedRisk: 'READ',
          verificationStrategy: 'read_record_back',
          executionOrder: 2,
        },
      ];
    }

    // Generic multi-step decomposition
    return [
      {
        title: `Analyze Objective: ${request.title}`,
        description: 'Examine constraints, required resources, and operational dependencies',
        dependencies: [],
        assignedCapability: serverNames[0],
        estimatedRisk: 'READ',
        verificationStrategy: 'validate_analysis_output',
        executionOrder: 1,
      },
      {
        title: 'Execute Tactical Action',
        description: `Perform primary execution for ${request.title}`,
        dependencies: [`Analyze Objective: ${request.title}`],
        assignedCapability: serverNames[0],
        estimatedRisk: 'LOW_RISK',
        verificationStrategy: 'validate_execution_output',
        executionOrder: 2,
      },
      {
        title: 'Verify Results & Store Memory',
        description: 'Validate output evidence and record outcomes in persistent memory',
        dependencies: ['Execute Tactical Action'],
        assignedCapability: undefined,
        estimatedRisk: 'READ',
        verificationStrategy: 'validate_completion_evidence',
        executionOrder: 3,
      },
    ];
  }

  private inferCapability(title: string): string | undefined {
    const lower = title.toLowerCase();
    if (lower.includes('github') || lower.includes('repo') || lower.includes('commit')) {
      return 'github-mcp-server';
    }
    if (lower.includes('supabase') || lower.includes('database') || lower.includes('sql')) {
      return 'supabase';
    }
    if (lower.includes('postman') || lower.includes('api') || lower.includes('endpoint')) {
      return 'postman-mcp-server';
    }
    if (lower.includes('notion') || lower.includes('document')) {
      return 'notion-mcp-server';
    }
    if (lower.includes('render') || lower.includes('deploy')) {
      return 'render';
    }
    return undefined;
  }

  private estimateTaskRisk(title: string): RiskLevel {
    const lower = title.toLowerCase();
    if (
      lower.includes('delete') ||
      lower.includes('drop') ||
      lower.includes('destroy') ||
      lower.includes('purge')
    ) {
      return 'SENSITIVE';
    }
    if (
      lower.includes('create') ||
      lower.includes('update') ||
      lower.includes('deploy') ||
      lower.includes('write') ||
      lower.includes('push')
    ) {
      return 'CONFIRMATION_REQUIRED';
    }
    if (lower.includes('execute') || lower.includes('run')) {
      return 'LOW_RISK';
    }
    return 'READ';
  }

  private riskPrecedence(risk: RiskLevel): number {
    switch (risk) {
      case 'READ':
        return 1;
      case 'LOW_RISK':
        return 2;
      case 'CONFIRMATION_REQUIRED':
        return 3;
      case 'SENSITIVE':
        return 4;
      default:
        return 1;
    }
  }
}
