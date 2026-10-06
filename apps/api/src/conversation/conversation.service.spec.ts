import { Test, TestingModule } from '@nestjs/testing';
import { ConversationService } from './conversation.service';
import { SupabaseService } from '../database/supabase.service';

describe('ConversationService', () => {
  let service: ConversationService;

  const mockSupabaseService = {
    getClient: jest.fn().mockReturnValue(null),
    configured: false,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConversationService,
        { provide: SupabaseService, useValue: mockSupabaseService },
      ],
    }).compile();

    service = module.get<ConversationService>(ConversationService);
  });

  it('should create conversation and append messages', async () => {
    const conv = await service.createConversation({
      userId: 'test-user',
      title: 'Strategic Planning Session',
      activeMode: 'plan',
    });

    expect(conv.id).toBeDefined();
    expect(conv.title).toBe('Strategic Planning Session');
    expect(conv.activeMode).toBe('plan');

    const msg = await service.addMessage(conv.id, {
      role: 'user',
      content: 'Hello DHAVON, prepare my day.',
    });

    expect(msg.id).toBeDefined();
    expect(msg.content).toBe('Hello DHAVON, prepare my day.');

    const history = await service.getRecentMessages(conv.id);
    expect(history.length).toBe(1);
    expect(history[0].role).toBe('user');
  });

  it('should prepare AI context correctly', async () => {
    const conv = await service.createConversation({ title: 'Context Test' });
    await service.addMessage(conv.id, { role: 'user', content: 'What is DHAVON?' });
    await service.addMessage(conv.id, { role: 'assistant', content: 'DHAVON is your Personal AI OS.' });

    const aiMessages = await service.prepareAIContext(conv.id);
    expect(aiMessages.length).toBe(2);
    expect(aiMessages[0].role).toBe('user');
    expect(aiMessages[1].role).toBe('assistant');
  });
});
