import {
  Controller,
  Get,
  Post,
  Body,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { VoiceSessionService } from './voice-session.service';
import { VoiceProviderFactory } from './voice-provider.factory';
import { STTOptions, TTSOptions } from '@dhavon/types';
import { IsString, IsOptional, MaxLength, IsNotEmpty } from 'class-validator';

export class StartSessionDto {
  @IsOptional()
  @IsString()
  @MaxLength(128)
  userId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  conversationId?: string;
}

export class TranscribeJsonDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  sessionId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(15000000) // ~11MB base64 max
  audioBase64!: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  mimeType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(16)
  language?: string;
}

export class SynthesizeDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(10000)
  text!: string;

  @IsOptional()
  options?: TTSOptions;
}

export class InterruptDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  sessionId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(256)
  reason?: string;
}

export interface UploadedAudioFile {
  buffer: Buffer;
  mimetype: string;
  originalname?: string;
  size?: number;
}

@Controller('voice')
export class VoiceController {
  constructor(
    private readonly sessionService: VoiceSessionService,
    private readonly providerFactory: VoiceProviderFactory,
  ) {}

  @Get('status')
  getStatus() {
    return {
      service: 'DHAVON Voice Intelligence System',
      status: 'online',
      providers: this.providerFactory.getStatus(),
      limits: {
        maxAudioSizeBytes: this.sessionService.maxAudioSizeBytes,
        maxAudioSizeMB: 10,
      },
    };
  }

  @Post('session')
  @HttpCode(HttpStatus.OK)
  startSession(@Body() body: StartSessionDto) {
    const session = this.sessionService.startSession(body.userId, body.conversationId);
    return {
      sessionId: session.id,
      state: session.state,
      conversationId: session.conversationId,
    };
  }

  @Post('transcribe')
  @HttpCode(HttpStatus.OK)
  async transcribeJson(@Body() body: TranscribeJsonDto) {
    if (!body?.sessionId) {
      throw new BadRequestException('sessionId is required');
    }
    if (!body?.audioBase64) {
      throw new BadRequestException('audioBase64 is required');
    }

    const mime = (body.mimeType || 'audio/webm').toLowerCase().split(';')[0].trim();
    const ALLOWED_MIMES = ['audio/webm', 'audio/wav', 'audio/x-wav', 'audio/mp3', 'audio/mpeg', 'audio/ogg', 'audio/m4a', 'audio/mp4', 'audio/aac'];
    if (!ALLOWED_MIMES.includes(mime)) {
      throw new BadRequestException(`Unsupported audio MIME type: ${body.mimeType}`);
    }

    const audioBuffer = Buffer.from(body.audioBase64, 'base64');
    const options: STTOptions = {
      mimeType: body.mimeType || 'audio/webm',
      language: body.language,
    };

    return this.sessionService.processAudioInput(body.sessionId, audioBuffer, options);
  }

  @Post('transcribe-file')
  @UseInterceptors(FileInterceptor('audio'))
  @HttpCode(HttpStatus.OK)
  async transcribeFile(
    @UploadedFile() file: UploadedAudioFile,
    @Body('sessionId') sessionId?: string,
    @Body('language') language?: string,
  ) {
    if (!file || !file.buffer) {
      throw new BadRequestException('Audio file must be uploaded');
    }

    const activeSessionId = sessionId || this.sessionService.startSession().id;
    const options: STTOptions = {
      mimeType: file.mimetype || 'audio/webm',
      language,
    };

    return this.sessionService.processAudioInput(activeSessionId, file.buffer, options);
  }

  @Post('synthesize')
  @HttpCode(HttpStatus.OK)
  async synthesize(@Body() body: SynthesizeDto) {
    if (!body?.text || body.text.trim().length === 0) {
      throw new BadRequestException('text is required');
    }

    const ttsProvider = this.providerFactory.getTTSProvider();
    return ttsProvider.synthesize(body.text, body.options);
  }

  @Post('interrupt')
  @HttpCode(HttpStatus.OK)
  interrupt(@Body() body: InterruptDto) {
    this.sessionService.interrupt(body?.sessionId || 'default', body?.reason);
    return { status: 'interrupted', timestamp: new Date().toISOString() };
  }
}
