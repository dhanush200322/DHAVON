import { McpPermissionService } from '../mcp/mcp-permission.service';
import { McpTool } from '@dhavon/mcp';

describe('Phase 7 Security: MCP Boundary & Authorization Hardening', () => {
  let permissionService: McpPermissionService;
  let mockPermissions: any;
  let mockAudit: any;
  let mockEvents: any;

  beforeEach(() => {
    mockPermissions = {};
    mockAudit = { record: jest.fn().mockResolvedValue(undefined) };
    mockEvents = { emitConfirmationRequired: jest.fn() };

    permissionService = new McpPermissionService(
      mockPermissions,
      mockAudit,
      mockEvents,
    );
  });

  const sensitiveTool: McpTool = {
    toolId: 'tool-sensitive-1',
    name: 'delete_repository',
    serverName: 'github-mcp-server',
    serverId: 'github-mcp-server',
    description: 'Delete a GitHub repository',
    inputSchema: { type: 'object', properties: {} },
    riskLevel: 'SENSITIVE',
    enabled: true,
    requiresConfirmation: true,
    available: true,
  };

  const writeTool: McpTool = {
    toolId: 'tool-write-1',
    name: 'create_issue',
    serverName: 'github-mcp-server',
    serverId: 'github-mcp-server',
    description: 'Create a GitHub issue',
    inputSchema: { type: 'object', properties: {} },
    riskLevel: 'CONFIRMATION_REQUIRED',
    enabled: true,
    requiresConfirmation: true,
    available: true,
  };

  const readTool: McpTool = {
    toolId: 'tool-read-1',
    name: 'search_repositories',
    serverName: 'github-mcp-server',
    serverId: 'github-mcp-server',
    description: 'Search public repositories',
    inputSchema: { type: 'object', properties: {} },
    riskLevel: 'READ',
    enabled: true,
    requiresConfirmation: false,
    available: true,
  };

  it('should immediately pause and block SENSITIVE tools from autonomous execution', async () => {
    const result = await permissionService.evaluate(
      'exec-1',
      sensitiveTool,
      { repo: 'DHAVON' },
      'user-1',
    );

    expect(result.allowed).toBe(false);
    expect(result.requiresConfirmation).toBe(true);
    expect(result.riskLevel).toBe('SENSITIVE');
    expect(mockEvents.emitConfirmationRequired).toHaveBeenCalled();
  });

  it('should pause CONFIRMATION_REQUIRED tools from executing without approval', async () => {
    const result = await permissionService.evaluate(
      'exec-2',
      writeTool,
      { title: 'Bug report' },
      'user-1',
    );

    expect(result.allowed).toBe(false);
    expect(result.requiresConfirmation).toBe(true);
  });

  it('should permit READ operations according to autonomous policy', async () => {
    const result = await permissionService.evaluate(
      'exec-3',
      readTool,
      { query: 'DHAVON' },
      'user-1',
    );

    expect(result.allowed).toBe(true);
    expect(result.requiresConfirmation).toBe(false);
  });

  it('should allow tool execution when explicit human approval is granted', async () => {
    permissionService.approve('exec-4', 'user-1');

    const result = await permissionService.evaluate(
      'exec-4',
      writeTool,
      { title: 'Approved Issue' },
      'user-1',
    );

    expect(result.allowed).toBe(true);
    expect(result.requiresConfirmation).toBe(false);
  });

  it('should strictly enforce single-use authorization and prevent replay attacks', async () => {
    permissionService.approve('exec-5', 'user-1');

    // First execution: approved
    const firstEval = await permissionService.evaluate('exec-5', writeTool, {}, 'user-1');
    expect(firstEval.allowed).toBe(true);

    // Consume the approval after execution completes
    const consumed = permissionService.consumeApproval('exec-5', 'user-1');
    expect(consumed).toBe(true);

    // Second execution attempt with same executionId: MUST BE REJECTED
    const replayEval = await permissionService.evaluate('exec-5', writeTool, {}, 'user-1');
    expect(replayEval.allowed).toBe(false);
    expect(replayEval.requiresConfirmation).toBe(true);
  });

  it('should reject approvals for mismatched user IDs (User B cannot approve User A)', async () => {
    permissionService.approve('exec-6', 'user-A');

    // User-B attempts to execute using User-A approval
    const result = await permissionService.evaluate('exec-6', writeTool, {}, 'user-B');
    expect(result.allowed).toBe(false);
    expect(result.requiresConfirmation).toBe(true);
  });
});
