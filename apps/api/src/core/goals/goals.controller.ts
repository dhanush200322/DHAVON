import { Controller, Get, Post, Body, Param, Query, NotFoundException } from '@nestjs/common';
import { GoalsService, CreateGoalDto } from './goals.service';
import { TasksService, CreateTaskDto } from '../tasks/tasks.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SYSTEM_USER_UUID } from '../../common/guards/auth.guard';

@Controller('goals')
export class GoalsController {
  constructor(
    private readonly goalsService: GoalsService,
    private readonly tasksService: TasksService,
  ) {}

  @Get()
  async getGoals(
    @CurrentUser() authUserId: string,
    @Query('userId') userId?: string,
  ) {
    const effectiveUserId = userId || authUserId;
    return this.goalsService.getGoals(effectiveUserId);
  }

  @Get(':id')
  async getGoalById(
    @CurrentUser() authUserId: string,
    @Param('id') id: string,
  ) {
    const goal = await this.goalsService.getGoalById(id);
    if (!goal || (goal.userId && goal.userId !== authUserId && authUserId !== SYSTEM_USER_UUID)) {
      throw new NotFoundException(`Goal ${id} not found`);
    }
    return goal;
  }

  @Post()
  async createGoal(
    @CurrentUser() authUserId: string,
    @Body() body: CreateGoalDto,
  ) {
    if (!body.userId) {
      body.userId = authUserId;
    }
    return this.goalsService.createGoal(body);
  }

  @Get(':id/tasks')
  async getGoalTasks(@Param('id') id: string) {
    const goal = await this.goalsService.getGoalById(id);
    if (!goal) {
      throw new NotFoundException(`Goal ${id} not found`);
    }
    return this.tasksService.getTasks(id);
  }

  @Post(':id/tasks')
  async createGoalTask(
    @Param('id') id: string,
    @Body() body: Omit<CreateTaskDto, 'goalId'>,
  ) {
    const goal = await this.goalsService.getGoalById(id);
    if (!goal) {
      throw new NotFoundException(`Goal ${id} not found`);
    }
    return this.tasksService.createTask({
      ...body,
      goalId: id,
    });
  }
}
