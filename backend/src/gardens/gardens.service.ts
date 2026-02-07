import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGardenDto } from './dto/create-garden.dto';
import { UpdateGardenStatusDto } from './dto/update-garden-status.dto';
import { CriticalWarningsService } from '../critical-warnings/critical-warnings.service';

@Injectable()
export class GardensService {
  constructor(
    private prisma: PrismaService,
    private criticalWarningsService: CriticalWarningsService,
  ) {}

  async create(tenantId: string, createGardenDto: CreateGardenDto) {
    // Verify campus exists for tenant
    const campus = await this.prisma.campus.findUnique({
      where: { tenantId_id: { tenantId, id: createGardenDto.campusId } },
    });

    if (!campus) {
      throw new NotFoundException(`Campus with ID ${createGardenDto.campusId} not found`);
    }

    return this.prisma.garden.create({
      data: {
        tenantId,
        name: createGardenDto.name,
        campusTenantId: tenantId,
        campusId: createGardenDto.campusId,
        status: 'ACTIVE',
      },
      include: {
        campus: true,
      },
    });
  }

  async findAll(tenantId: string, campusId?: string, status?: string) {
    const where: any = { tenantId };
    if (campusId) {
      where.campusId = campusId;
    }
    if (status) {
      where.status = status;
    }

    // Fetch gardens without _count
    const gardens = await this.prisma.garden.findMany({
      where,
      include: {
        campus: true,
      },
      orderBy: { id: 'asc' },
    });

    // Aggregate open critical warnings by gardenId (tenant-scoped)
    const openWarningCounts = await this.prisma.criticalWarning.groupBy({
      by: ['gardenId'],
      where: {
        status: 'OPEN',
        garden: { tenantId },
      },
      _count: {
        _all: true,
      },
    });

    // Build a map: gardenId -> count
    const openCountMap = new Map<number, number>();
    for (const row of openWarningCounts) {
      openCountMap.set(row.gardenId, row._count._all);
    }

    // Map gardens to include openCriticalWarningCount
    return gardens.map((garden) => ({
      ...garden,
      openCriticalWarningCount: openCountMap.get(garden.id) ?? 0,
    }));
  }

  async findOne(tenantId: string, id: number) {
    const garden = await this.prisma.garden.findFirst({
      where: { id, tenantId },
      include: {
        campus: true,
      },
    });

    if (!garden) {
      throw new NotFoundException(`Garden with ID ${id} not found`);
    }

    const openCriticalWarningCount = await this.prisma.criticalWarning.count({
      where: {
        gardenId: garden.id,
        status: 'OPEN',
        garden: { tenantId },
      },
    });

    return {
      ...garden,
      openCriticalWarningCount,
    };
  }

  async updateStatus(tenantId: string, id: number, updateGardenStatusDto: UpdateGardenStatusDto) {
    const garden = await this.findOne(tenantId, id);

    return this.prisma.garden.update({
      where: { id },
      data: {
        status: updateGardenStatusDto.status,
      },
      include: {
        campus: true,
      },
    });
  }
}
