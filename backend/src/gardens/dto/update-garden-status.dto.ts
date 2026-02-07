import { IsEnum } from 'class-validator';
import { GardenStatus } from '@prisma/client';

export class UpdateGardenStatusDto {
  @IsEnum(GardenStatus)
  status: GardenStatus;
}
