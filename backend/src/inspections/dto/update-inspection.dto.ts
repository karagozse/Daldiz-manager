import { IsEnum, IsInt, IsOptional } from 'class-validator';
import { InspectionStatus } from '@prisma/client';

export class UpdateInspectionDto {
  @IsEnum(InspectionStatus)
  @IsOptional()
  status?: InspectionStatus;

  @IsInt()
  @IsOptional()
  score?: number;

  // JSON field: can be array or object
  @IsOptional()
  topics?: any;
}
