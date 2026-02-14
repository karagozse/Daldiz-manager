import { Module } from '@nestjs/common';
import { DailyFieldCheckService } from './daily-field-check.service';
import { DailyFieldCheckController } from './daily-field-check.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [DailyFieldCheckController],
  providers: [DailyFieldCheckService],
  exports: [DailyFieldCheckService],
})
export class DailyFieldCheckModule {}
