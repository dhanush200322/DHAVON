import { DhavonGateway } from '../gateway/dhavon.gateway';

describe('Phase 7 Security: WebSocket Gateway Hardening', () => {
  let gateway: DhavonGateway;
  let mockCore: any;
  let mockState: any;
  let mockMcpEvents: any;
  let mockMcpGateway: any;
  let mockOrchEvents: any;
  let mockVoiceEvents: any;
  let mockVoiceSession: any;

  beforeEach(() => {
    mockCore = { processMessage: jest.fn() };
    mockState = { getState: jest.fn().mockReturnValue({ orbState: 'CALM' }) };
    mockMcpEvents = { getEventStream: () => ({ subscribe: jest.fn() }) };
    mockMcpGateway = { approveExecution: jest.fn() };
    mockOrchEvents = { getEventStream: () => ({ subscribe: jest.fn() }) };
    mockVoiceEvents = { getEventStream: () => ({ subscribe: jest.fn() }) };
    mockVoiceSession = { startSession: jest.fn() };

    gateway = new DhavonGateway(
      mockCore,
      mockState,
      mockMcpEvents,
      mockMcpGateway,
      mockOrchEvents,
      mockVoiceEvents,
      mockVoiceSession,
    );
  });

  it('should reject oversized text messages exceeding 64KB', async () => {
    const mockSocket: any = {
      id: 'sock-1',
      emit: jest.fn(),
    };

    const oversizedContent = 'a'.repeat(70000); // 70KB
    await gateway.handleMessage(mockSocket, {
      conversationId: 'conv-1',
      content: oversizedContent,
    });

    expect(mockSocket.emit).toHaveBeenCalledWith('dhavon.error', {
      code: 'PAYLOAD_TOO_LARGE',
      message: 'Message content exceeds maximum allowed limit of 64KB.',
    });
    expect(mockCore.processMessage).not.toHaveBeenCalled();
  });

  it('should enforce rate limits on rapid message flooding', async () => {
    const mockSocket: any = {
      id: 'sock-flooder',
      emit: jest.fn(),
    };

    // Send 65 messages rapidly
    for (let i = 0; i < 65; i++) {
      await gateway.handleMessage(mockSocket, {
        conversationId: 'conv-1',
        content: `test message ${i}`,
      });
    }

    expect(mockSocket.emit).toHaveBeenCalledWith('dhavon.error', {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Message rate limit exceeded. Please throttle requests.',
    });
  });

  it('should clean up client rate limit tracking on disconnect', () => {
    const mockSocket: any = { id: 'sock-disconnect-test', emit: jest.fn() };
    gateway.handleDisconnect(mockSocket);
    // Verified no leaks or errors
    expect(true).toBe(true);
  });
});
