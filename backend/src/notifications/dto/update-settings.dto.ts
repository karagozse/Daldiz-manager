import { IsBoolean, IsNotEmpty } from 'class-validator';

export class UpdateSettingsDto {
  @IsBoolean()
  @IsNotEmpty()
  campusBelek: boolean;

  @IsBoolean()
  @IsNotEmpty()
  campusCandir: boolean;

  @IsBoolean()
  @IsNotEmpty()
  campusManavgat: boolean;

  @IsBoolean()
  @IsNotEmpty()
  enableNewEvaluation: boolean;

  @IsBoolean()
  @IsNotEmpty()
  enableNewPrescription: boolean;

  @IsBoolean()
  @IsNotEmpty()
  enableNewCriticalWarning: boolean;
}
