import { IsString, IsNotEmpty } from 'class-validator';

export class CreateGardenDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  campusId: string;
}
