import { Module, OnModuleInit } from '@nestjs/common';
import { HarvestController } from './harvest.controller';
import { HarvestService } from './harvest.service';
import { PrismaModule } from '../prisma/prisma.module';
import { TradersModule } from '../traders/traders.module';

@Module({
  imports: [PrismaModule, TradersModule],
  controllers: [HarvestController],
  providers: [HarvestService],
  exports: [HarvestService],
})
export class HarvestModule implements OnModuleInit {
  onModuleInit() {
    console.log('Harvest module ready');
  }
}
