import { Controller, Get, Post, Body, Param, Query, NotFoundException } from '@nestjs/common';
import { GoalsService, CreateGoalDto } from './goals.service';
import { TasksService, CreateTaskDto } from '../tasks/tasks.service';

@Controller('goals')
export class GoalsController {
  constructor(
    private readonly goalsService: GoalsService,
    private readonly tasksService: TasksService,
  ) {}

  @Get()
  async getGoals(@Query('userId') userId?: string) {
    return this.goalsService.getGoals(userId);
  }

  @Get(':id')
  async getGoalById(@Param('id') id: string) {
    const goal = await this.goalsService.getGoalById(id);
    if (!goal) {
      throw new NotFoundException(`Goal ${id} not found`);
    }
    return goal;
  }

  @Post()
  async createGoal(@Body() body: CreateGoalDto) {
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
