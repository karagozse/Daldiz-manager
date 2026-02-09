import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateHarvestDto {
  @IsOptional()
  @IsString()
  date?: string; // YYYY-MM-DD

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  gardenId?: number;

  @IsOptional()
  @IsString()
  traderName?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  pricePerKg?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  grade1Kg?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  grade2Kg?: number | null;

  @IsOptional()
  @IsString()
  thirdLabel?: string | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  thirdKg?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  thirdPricePerKg?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  independentScaleFullKg?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  independentScaleEmptyKg?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  traderScaleFullKg?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  traderScaleEmptyKg?: number | null;
}
