import { Module } from '@nestjs/common';
import { TradersController } from './traders.controller';
import { TradersService } from './traders.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [TradersController],
  providers: [TradersService],
  exports: [TradersService],
})
export class TradersModule {}
