import { IsInt, IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';

export enum CriticalWarningSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

export class CreateCriticalWarningDto {
  @IsInt()
  @IsNotEmpty()
  topicId: number;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsEnum(CriticalWarningSeverity)
  @IsOptional()
  severity?: CriticalWarningSeverity;
}