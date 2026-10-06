import { Controller, Get, Post, Body, Param, Query, NotFoundException } from '@nestjs/common';
import { TasksService, CreateTaskDto } from './tasks.service';

@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  async getTasks(@Query('goalId') goalId?: string) {
    return this.tasksService.getTasks(goalId);
  }

  @Get(':id')
  async getTaskById(@Param('id') id: string) {
    const task = await this.tasksService.getTaskById(id);
    if (!task) {
      throw new NotFoundException(`Task ${id} not found`);
    }
    return task;
  }

  @Post()
  async createTask(@Body() body: CreateTaskDto) {
    return this.tasksService.createTask(body);
  }
}
