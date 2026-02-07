import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { CampusesService } from './campuses.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('campuses')
@UseGuards(JwtAuthGuard)
export class CampusesController {
  constructor(private readonly campusesService: CampusesService) {}

  @Get()
  findAll() {
    return this.campusesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.campusesService.findOne(id);
  }
}
