import { IsIn, IsOptional, IsString } from 'class-validator';

export class ReviewPrescriptionDto {
  @IsIn(['approved', 'rejected'])
  @IsString()
  status: 'approved' | 'rejected'; // pending -> approved or rejected

  @IsOptional()
  @IsString()
  reviewNote?: string;
}
