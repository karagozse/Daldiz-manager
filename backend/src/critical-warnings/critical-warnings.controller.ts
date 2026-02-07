import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { CriticalWarningsService } from './critical-warnings.service';
import { CreateCriticalWarningDto } from './dto/create-critical-warning.dto';
import { UpdateCriticalWarningDto } from './dto/update-critical-warning.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@Controller()
@UseGuards(JwtAuthGuard)
export class CriticalWarningsController {
  constructor(private readonly criticalWarningsService: CriticalWarningsService) {}

  /**
   * POST /inspections/:inspectionId/critical-warnings
   * Create a new critical warning for an inspection
   * Roles: root, denetci → LEAD_AUDITOR, SUPER_ADMIN
   */
  @Post('inspections/:inspectionId/critical-warnings')
  @UseGuards(RolesGuard)
  @Roles(Role.LEAD_AUDITOR, Role.SUPER_ADMIN)
  create(
    @Param('inspectionId') inspectionId: string,
    @Body() createDto: CreateCriticalWarningDto,
    @CurrentUser() user: { id: number },
  ) {
    return this.criticalWarningsService.create(inspectionId, createDto, user.id);
  }

  /**
   * PATCH /critical-warnings/:id
   * Update a critical warning (status, closure note, severity)
   * Roles: root, denetci → LEAD_AUDITOR, SUPER_ADMIN
   */
  @Patch('critical-warnings/:id')
  @UseGuards(RolesGuard)
  @Roles(Role.LEAD_AUDITOR, Role.SUPER_ADMIN)
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdateCriticalWarningDto,
    @CurrentUser() user: { id: number },
  ) {
    // If status is being changed to CLOSED, use current user as closedById
    const closedById = updateDto.status === 'CLOSED' ? user.id : undefined;
    return this.criticalWarningsService.update(id, updateDto, closedById);
  }

  /**
   * GET /critical-warnings
   * Get all critical warnings with optional filters
   */
  @Get('critical-warnings')
  findAll(
    @Query('status') status?: string,
    @Query('campusId') campusId?: string,
    @Query('topicId') topicId?: string,
    @Query('limit', new DefaultValuePipe(100), ParseIntPipe) limit?: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset?: number,
  ) {
    const topicIdNum = topicId ? parseInt(topicId, 10) : undefined;
    return this.criticalWarningsService.findAll(status, campusId, topicIdNum, limit, offset);
  }

  /**
   * GET /gardens/:gardenId/critical-warnings
   * Get critical warnings for a specific garden
   */
  @Get('gardens/:gardenId/critical-warnings')
  findByGardenId(
    @Param('gardenId', ParseIntPipe) gardenId: number,
    @Query('status') status?: string,
  ) {
    return this.criticalWarningsService.findByGardenId(gardenId, status);
  }
}