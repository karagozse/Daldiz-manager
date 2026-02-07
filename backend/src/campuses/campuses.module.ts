import { Module } from '@nestjs/common';
import { CampusesService } from './campuses.service';
import { CampusesController } from './campuses.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { CriticalWarningsModule } from '../critical-warnings/critical-warnings.module';

@Module({
  imports: [PrismaModule, CriticalWarningsModule],
  controllers: [CampusesController],
  providers: [CampusesService],
  exports: [CampusesService],
})
export class CampusesModule {}
