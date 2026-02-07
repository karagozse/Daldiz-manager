import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CriticalWarningsService } from '../critical-warnings/critical-warnings.service';

@Injectable()
export class CampusesService {
  constructor(
    private prisma: PrismaService,
    private criticalWarningsService: CriticalWarningsService,
  ) {}

  async findAll() {
    const campuses = await this.prisma.campus.findMany({
      include: {
        gardens: true,
      },
      orderBy: { id: 'asc' },
    });

    // Add openCriticalWarningCount to each campus
    const campusesWithCounts = await Promise.all(
      campuses.map(async (campus) => {
        const openCriticalWarningCount = await this.prisma.criticalWarning.count({
          where: {
            status: 'OPEN',
            gardenId: { in: campus.gardens.map((g) => g.id) },
          },
        });

        return {
          ...campus,
          openCriticalWarningCount,
        };
      }),
    );

    return campusesWithCounts;
  }

  async findOne(id: string) {
    const campus = await this.prisma.campus.findUnique({
      where: { id },
      include: {
        gardens: {
          where: { status: 'ACTIVE' },
        },
      },
    });

    if (!campus) {
      return null;
    }

    // Add openCriticalWarningCount
    const openCriticalWarningCount = await this.prisma.criticalWarning.count({
      where: {
        status: 'OPEN',
        gardenId: { in: campus.gardens.map((g) => g.id) },
      },
    });

    return {
      ...campus,
      openCriticalWarningCount,
    };
  }
}
