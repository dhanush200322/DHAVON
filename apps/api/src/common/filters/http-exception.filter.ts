import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : null;

    let message = 'An unexpected internal error occurred.';
    let code = 'INTERNAL_ERROR';

    if (typeof exceptionResponse === 'string') {
      message = exceptionResponse;
    } else if (
      typeof exceptionResponse === 'object' &&
      exceptionResponse !== null
    ) {
      const resp = exceptionResponse as Record<string, unknown>;
      message = (resp.message as string) || message;
      code = (resp.error as string) || code;
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    const requestId =
      (request?.headers['x-request-id'] as string) || uuidv4();

    this.logger.error(
      `[${requestId}] ${request?.method} ${request?.url} - Status ${status} - Error: ${message}`,
      exception instanceof Error ? exception.stack : undefined,
    );

    response.status(status).json({
      code: typeof code === 'string' ? code.toUpperCase() : 'ERROR',
      message,
      timestamp: new Date().toISOString(),
      requestId,
      path: request?.url,
    });
  }
}
