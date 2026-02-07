import { IsString, IsOptional } from 'class-validator';

export class UpdatePrescriptionDto {
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
