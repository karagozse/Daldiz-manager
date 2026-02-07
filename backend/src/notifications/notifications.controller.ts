import { Controller, Get, Put, Post, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { NotificationsService } from './notifications.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { Role } from '@prisma/client';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  /**
   * GET /notifications/settings
   * Return current user's notification settings. Create with defaults if none exist.
   */
  @Get('settings')
  getSettings(@CurrentUser() user: { id: number }) {
    return this.notificationsService.getSettings(user.id);
  }

  /**
   * PUT /notifications/settings
   * Upsert current user's notification settings.
   */
  @Put('settings')
  updateSettings(
    @CurrentUser() user: { id: number },
    @Body() dto: UpdateSettingsDto,
  ) {
    return this.notificationsService.updateSettings(user.id, dto);
  }

  /**
   * POST /notifications/subscriptions
   * Register or update a web push subscription for the current user.
   */
  @Post('subscriptions')
  createSubscription(
    @CurrentUser() user: { id: number },
    @Body() dto: CreateSubscriptionDto,
  ) {
    return this.notificationsService.createSubscription(user.id, dto);
  }

  /**
   * POST /notifications/test
   * Send a test notification to the current user (for debugging/testing purposes)
   * Protected: Only ADMIN and SUPER_ADMIN can access this endpoint
   */
  @Post('test')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  async sendTest(@CurrentUser() user: { id: number }) {
    await this.notificationsService.sendTestNotification(user.id);
    return { ok: true, message: 'Test notification sent' };
  }
}
