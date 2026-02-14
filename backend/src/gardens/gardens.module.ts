import { Module } from '@nestjs/common';
import { GardensService } from './gardens.service';
import { GardensController } from './gardens.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { InspectionsModule } from '../inspections/inspections.module';
import { CriticalWarningsModule } from '../critical-warnings/critical-warnings.module';
import { DailyFieldCheckModule } from '../daily-field-check/daily-field-check.module';

@Module({
  imports: [PrismaModule, InspectionsModule, CriticalWarningsModule, DailyFieldCheckModule],
  controllers: [GardensController],
  providers: [GardensService],
  exports: [GardensService],
})
export class GardensModule {}
