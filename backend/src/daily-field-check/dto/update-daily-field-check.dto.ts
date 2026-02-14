import { IsObject, IsOptional } from 'class-validator';

export class UpdateDailyFieldCheckDto {
  @IsObject()
  @IsOptional()
  answers?: Record<string, unknown>;
}
