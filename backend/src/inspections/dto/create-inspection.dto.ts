import { IsInt, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { InspectionStatus } from '@prisma/client';

export class CreateInspectionDto {
  @IsInt()
  @IsNotEmpty()
  gardenId: number;

  @IsEnum(InspectionStatus)
  @IsOptional()
  status?: InspectionStatus; // default to DRAFT in service if not provided

  // JSON field: can be array or object, we don't validate the internal structure here
  @IsOptional()
  topics?: any;
}
