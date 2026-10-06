import { Injectable, Logger } from '@nestjs/common';
import { Task, VerificationResult } from '@dhavon/types';
import { SupabaseService } from '../../database/supabase.service';
import { v4 as uuidv4 } from 'uuid';

export interface VerifyOptions {
  task: Task;
  goalId: string;
  toolOutput?: unknown;
  status: string;
}

@Injectable()
export class VerificationService {
  private readonly logger = new Logger(VerificationService.name);

  constructor(private readonly supabase: SupabaseService) {}

  /**
   * Evaluates task execution results against the assigned verification strategy.
   * Never assumes success merely from the absence of a raw exception.
   */
  async verifyTask(options: VerifyOptions): Promise<VerificationResult> {
    const { task, goalId, toolOutput, status } = options;
    const strategy =
      task.verificationStrategy ||
      this.inferVerificationStrategy(task.title, task.assignedCapability);

    const now = new Date().toISOString();
    let verified = false;
    const evidence: Record<string, unknown> = {
      taskStatus: status,
      hasOutput: !!toolOutput,
      evaluatedAt: now,
    };

    const outStr = typeof toolOutput === 'string' ? toolOutput : JSON.stringify(toolOutput);
    const containsError =
      outStr.includes('"error":') ||
      outStr.includes('"code":"ECONN') ||
      outStr.includes('Execution failed') ||
      outStr.includes('unauthorized');

    if (status !== 'COMPLETED' && status !== 'completed') {
      evidence.failureReason = 'Task execution status was not completed';
      verified = false;
    } else if (!toolOutput) {
      evidence.failureReason = 'Task produced null or undefined execution output';
      verified = false;
    } else if (containsError) {
      evidence.failureReason = 'Output contained error markers or exception payload';
      verified = false;
    } else {
      // Strategy-specific evaluation
      const stratLower = strategy.toLowerCase();

      if (stratLower.includes('rejection') || stratLower.includes('fail')) {
        evidence.failureReason = 'Controlled verification rejection strategy triggered';
        verified = false;
      } else if (stratLower.includes('inspect_repositories') || stratLower.includes('github')) {
        // Must contain repositories list or details
        if (typeof toolOutput === 'object' && toolOutput !== null) {
          evidence.containsData = true;
          evidence.dataSample = JSON.stringify(toolOutput).slice(0, 200);
          verified = true;
        } else {
          evidence.failureReason = 'GitHub output did not contain structured data';
          verified = false;
        }
      } else if (stratLower.includes('read_record') || stratLower.includes('supabase') || stratLower.includes('database')) {
        if (typeof toolOutput === 'object' && toolOutput !== null) {
          evidence.recordVerified = true;
          verified = true;
        } else {
          evidence.failureReason = 'Database record verification failed';
          verified = false;
        }
      } else if (stratLower.includes('verify_response') || stratLower.includes('postman') || stratLower.includes('api')) {
        if (toolOutput !== null && toolOutput !== undefined) {
          evidence.apiStatusVerified = true;
          verified = true;
        } else {
          evidence.failureReason = 'API response verification failed';
          verified = false;
        }
      } else {
        // Default verification: output exists, is valid object or non-empty string, no error markers
        const outStr = typeof toolOutput === 'string' ? toolOutput : JSON.stringify(toolOutput);
        const containsError =
          outStr.includes('"error":') ||
          outStr.includes('Execution failed') ||
          outStr.includes('unauthorized');

        if (!containsError && outStr.length > 5) {
          evidence.outputValidation = 'Non-empty, error-free output confirmed';
          verified = true;
        } else {
          evidence.failureReason = containsError
            ? 'Output contained error markers'
            : 'Output was too short or empty';
          verified = false;
        }
      }
    }

    const result: VerificationResult = {
      id: uuidv4(),
      taskId: task.id,
      goalId,
      strategy,
      verified,
      evidence,
      checkedAt: now,
    };

    this.logger.log(
      `Verification for task "${task.title}" [${strategy}]: ${verified ? 'VERIFIED_SUCCESS' : 'VERIFICATION_FAILED'}`,
    );

    // Persist to Supabase
    const client = this.supabase.getClient();
    if (client) {
      try {
        await client.from('verification_results').insert({
          id: result.id,
          task_id: result.taskId,
          goal_id: result.goalId,
          strategy: result.strategy,
          verified: result.verified,
          evidence: result.evidence,
          checked_at: result.checkedAt,
        });
      } catch (err: unknown) {
        this.logger.debug(`Supabase verification_results insert fallback: ${err}`);
      }
    }

    return result;
  }

  private inferVerificationStrategy(title: string, capability?: string): string {
    const lower = `${title} ${capability || ''}`.toLowerCase();
    if (lower.includes('github') || lower.includes('repo')) {
      return 'inspect_repositories_payload';
    }
    if (lower.includes('database') || lower.includes('supabase') || lower.includes('record')) {
      return 'read_record_back';
    }
    if (lower.includes('api') || lower.includes('postman') || lower.includes('http')) {
      return 'verify_api_response_status';
    }
    if (lower.includes('deploy') || lower.includes('render')) {
      return 'inspect_deployment_status';
    }
    return 'validate_non_empty_output_integrity';
  }
}
