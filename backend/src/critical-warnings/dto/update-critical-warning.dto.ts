import { IsString, IsOptional, IsEnum } from 'class-validator';

export enum CriticalWarningStatus {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
}

export enum CriticalWarningSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

export class UpdateCriticalWarningDto {
  @IsEnum(CriticalWarningStatus)
  @IsOptional()
  status?: CriticalWarningStatus;

  @IsString()
  @IsOptional()
  closureNote?: string;

  @IsEnum(CriticalWarningSeverity)
  @IsOptional()
  severity?: CriticalWarningSeverity;
}