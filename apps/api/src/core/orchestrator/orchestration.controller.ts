import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  NotFoundException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { OrchestrationService } from './orchestration.service';
import { PlannerService } from './planner.service';
import { GoalsService } from '../goals/goals.service';
import { TasksService } from '../tasks/tasks.service';

import { IsOptional, IsString, MaxLength } from 'class-validator';

export class PlanGoalDto {
  @IsOptional()
  @IsString()
  @MaxLength(128)
  userId?: string;
}

export class ExecuteGoalDto {
  @IsOptional()
  @IsString()
  @MaxLength(128)
  userId?: string;
}

@Controller()
export class OrchestrationController {
  constructor(
    private readonly orchestrationService: OrchestrationService,
    private readonly plannerService: PlannerService,
    private readonly goalsService: GoalsService,
    private readonly tasksService: TasksService,
  ) {}

  @Get('orchestration/:id')
  async getOrchestrationRun(@Param('id') id: string) {
    const run = await this.orchestrationService.getOrchestrationRun(id);
    if (!run) {
      throw new NotFoundException(`Orchestration run ${id} not found`);
    }
    return run;
  }

  @Post('goals/:id/plan')
  @HttpCode(HttpStatus.OK)
  async planGoal(
    @Param('id') id: string,
    @Body() body: PlanGoalDto,
  ) {
    const goal = await this.goalsService.getGoalById(id);
    if (!goal) {
      throw new NotFoundException(`Goal ${id} not found`);
    }

    return this.plannerService.planGoal({
      goalId: goal.id,
      title: goal.title,
      description: goal.description,
      userId: body.userId || goal.userId,
    });
  }

  @Post('goals/:id/execute')
  @HttpCode(HttpStatus.OK)
  async executeGoal(
    @Param('id') id: string,
    @Body() body: ExecuteGoalDto,
  ) {
    const goal = await this.goalsService.getGoalById(id);
    if (!goal) {
      throw new NotFoundException(`Goal ${id} not found`);
    }

    return this.orchestrationService.executeGoal(id, body.userId || goal.userId);
  }

  @Get('goals/:id/status')
  async getGoalStatus(@Param('id') id: string) {
    const goal = await this.goalsService.getGoalById(id);
    if (!goal) {
      throw new NotFoundException(`Goal ${id} not found`);
    }

    const tasks = await this.tasksService.getTasks(id);
    return {
      goal,
      tasks,
      taskCount: tasks.length,
      completedTasks: tasks.filter((t) => String(t.status).toUpperCase() === 'COMPLETED').length,
      progress: goal.progress,
      status: goal.status,
    };
  }
}
