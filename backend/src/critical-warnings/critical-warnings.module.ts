import { Module } from '@nestjs/common';
import { CriticalWarningsService } from './critical-warnings.service';
import { CriticalWarningsController } from './critical-warnings.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [CriticalWarningsController],
  providers: [CriticalWarningsService],
  exports: [CriticalWarningsService],
})
export class CriticalWarningsModule {}