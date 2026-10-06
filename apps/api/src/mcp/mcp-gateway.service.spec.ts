import { Test, TestingModule } from '@nestjs/testing';
import { McpGatewayService } from './mcp-gateway.service';
import { McpRegistryService } from './mcp-registry.service';
import { McpDiscoveryService } from './mcp-discovery.service';
import { McpPermissionService } from './mcp-permission.service';
import { McpExecutionService } from './mcp-execution.service';
import { McpToolSelectorService } from './mcp-tool-selector.service';
import { McpEventsService } from './mcp-events.service';
import { AuditService } from '../core/audit/audit.service';
import { StateService } from '../core/state/state.service';
import { SupabaseService } from '../database/supabase.service';
import { PermissionsService } from '../core/permissions/permissions.service';
import { McpTool } from '@dhavon/mcp';

describe('McpGatewayService & Subsystems', () => {
  let gateway: McpGatewayService;
  let registry: McpRegistryService;
  let execution: McpExecutionService;
  let permissions: McpPermissionService;
  let selector: McpToolSelectorService;
  let discovery: McpDiscoveryService;

  const mockAuditService = {
    record: jest.fn().mockResolvedValue(undefined),
  };

  const mockSupabaseService = {
    getClient: jest.fn().mockReturnValue(null),
    configured: false,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        McpGatewayService,
        McpRegistryService,
        McpDiscoveryService,
        McpPermissionService,
        McpExecutionService,
        McpToolSelectorService,
        McpEventsService,
        StateService,
        PermissionsService,
        { provide: AuditService, useValue: mockAuditService },
        { provide: SupabaseService, useValue: mockSupabaseService },
      ],
    }).compile();

    gateway = module.get<McpGatewayService>(McpGatewayService);
    registry = module.get<McpRegistryService>(McpRegistryService);
    execution = module.get<McpExecutionService>(McpExecutionService);
    permissions = module.get<McpPermissionService>(McpPermissionService);
    selector = module.get<McpToolSelectorService>(McpToolSelectorService);
    discovery = module.get<McpDiscoveryService>(McpDiscoveryService);

    // Register a sample server and tools
    registry.registerServer({
      id: 'github',
      name: 'github-mcp-server',
      description: 'GitHub testing server',
      provider: 'native',
      status: 'online',
      transport: 'native',
      enabled: true,
      capabilities: ['repo_inspect'],
    });

    const readTool: McpTool = {
      toolId: 'github:search_repositories',
      serverId: 'github',
      serverName: 'github-mcp-server',
      name: 'search_repositories',
      description: 'Search GitHub repos',
      inputSchema: {
        type: 'object',
        properties: { query: { type: 'string' } },
        required: ['query'],
      },
      riskLevel: 'READ',
      enabled: true,
      requiresConfirmation: false,
      available: true,
    };

    const confirmTool: McpTool = {
      toolId: 'github:create_issue',
      serverId: 'github',
      serverName: 'github-mcp-server',
      name: 'create_issue',
      description: 'Create issue',
      inputSchema: {
        type: 'object',
        properties: { title: { type: 'string' } },
        required: ['title'],
      },
      riskLevel: 'CONFIRMATION_REQUIRED',
      enabled: true,
      requiresConfirmation: true,
      available: true,
    };

    const sensitiveTool: McpTool = {
      toolId: 'github:delete_branch',
      serverId: 'github',
      serverName: 'github-mcp-server',
      name: 'delete_branch',
      description: 'Delete branch',
      inputSchema: {
        type: 'object',
        properties: { branch: { type: 'string' } },
        required: ['branch'],
      },
      riskLevel: 'SENSITIVE',
      enabled: true,
      requiresConfirmation: true,
      available: true,
    };

    registry.registerTool(readTool);
    registry.registerTool(confirmTool);
    registry.registerTool(sensitiveTool);
  });

  describe('Discovery & Risk Classification', () => {
    it('should correctly classify risk levels based on tool intent', () => {
      expect(discovery.classifyToolRisk('github-mcp-server', 'search_repositories')).toBe('READ');
      expect(discovery.classifyToolRisk('github-mcp-server', 'create_pull_request')).toBe('CONFIRMATION_REQUIRED');
      expect(discovery.classifyToolRisk('github-mcp-server', 'delete_branch')).toBe('SENSITIVE');
      expect(discovery.classifyToolRisk('supabase', 'execute_sql')).toBe('SENSITIVE');
      expect(discovery.classifyToolRisk('supabase', 'list_tables')).toBe('READ');
    });
  });

  describe('Permission & Confirmation Flow', () => {
    it('should allow READ tools to execute directly', async () => {
      const result = await gateway.executeTool({
        serverId: 'github',
        toolName: 'search_repositories',
        arguments: { query: 'DHAVON' },
      });

      expect(result.success).toBe(true);
      expect(result.status).toBe('COMPLETED');
      expect(result.riskLevel).toBe('READ');
    });

    it('should require confirmation and reject autonomous execution for CONFIRMATION_REQUIRED tools', async () => {
      const result = await gateway.executeTool({
        serverId: 'github',
        toolName: 'create_issue',
        arguments: { title: 'Test issue' },
      });

      expect(result.success).toBe(false);
      expect(result.status).toBe('REJECTED');
      expect(result.errorMessage).toContain('requires confirmation');
    });

    it('should allow CONFIRMATION_REQUIRED tool once user approves', async () => {
      const executionId = 'test-exec-123';
      const initial = await gateway.executeTool({
        executionId,
        serverId: 'github',
        toolName: 'create_issue',
        arguments: { title: 'Approved Issue' },
      });

      expect(initial.status).toBe('REJECTED');

      // User approves execution
      const approved = await gateway.approveExecution(executionId, 'user1');
      expect(approved.success).toBe(true);
      expect(approved.status).toBe('COMPLETED');
    });

    it('should strictly block SENSITIVE tools without human approval', async () => {
      const result = await gateway.executeTool({
        serverId: 'github',
        toolName: 'delete_branch',
        arguments: { branch: 'feature' },
      });

      expect(result.success).toBe(false);
      expect(result.status).toBe('REJECTED');
      expect(result.errorMessage).toContain('SENSITIVE');
    });
  });

  describe('Input Validation & Sanitization', () => {
    it('should reject requests with missing required fields', async () => {
      await expect(
        gateway.executeTool({
          serverId: 'github',
          toolName: 'search_repositories',
          arguments: {}, // missing 'query'
        }),
      ).rejects.toThrow('Missing required parameter');
    });

    it('should sanitize secrets from tool outputs', () => {
      const raw = {
        key: 'ghp_123456789012345678901234567890123456',
        data: 'safe repository info',
      };
      const sanitized = execution.sanitizeOutput(raw);
      expect(JSON.stringify(sanitized.content)).not.toContain('ghp_123456789012345678901234567890123456');
      expect(JSON.stringify(sanitized.content)).toContain('[REDACTED_SECRET]');
    });
  });

  describe('Tool Selection Abstraction', () => {
    it('should resolve GitHub candidate for repo search queries', () => {
      const candidate = gateway.resolveCandidateForQuery('Check my GitHub repositories');
      expect(candidate).not.toBeNull();
      expect(candidate?.tool.name).toBe('search_repositories');
      expect(candidate?.confidence).toBeGreaterThan(0.9);
    });
  });
});
