import { IsString, IsOptional } from 'class-validator';

export class CreatePrescriptionDto {
  @IsString()
  campusId: string;

  @IsOptional()
  @IsString()
  ventilation?: string;

  @IsOptional()
  @IsString()
  irrigation?: string;

  @IsOptional()
  @IsString()
  fertilization?: string;
}
