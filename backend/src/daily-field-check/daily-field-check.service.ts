import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DailyFieldCheckStatus } from '@prisma/client';

@Injectable()
export class DailyFieldCheckService {
  constructor(private prisma: PrismaService) {}

  /** Validate date string YYYY-MM-DD, return Date or throw BadRequestException */
  private parseDate(dateStr: string): Date {
    if (!dateStr || typeof dateStr !== 'string' || !dateStr.trim()) {
      throw new BadRequestException('date query param is required (YYYY-MM-DD)');
    }
    const trimmed = dateStr.trim();
    const match = /^\d{4}-\d{2}-\d{2}$/.exec(trimmed);
    if (!match) {
      throw new BadRequestException('Invalid date format. Use YYYY-MM-DD.');
    }
    const dateObj = new Date(trimmed + 'T12:00:00.000Z');
    if (isNaN(dateObj.getTime())) {
      throw new BadRequestException('Invalid date format. Use YYYY-MM-DD.');
    }
    return dateObj;
  }

  /**
   * Get existing daily field check for garden+date. Does NOT create.
   * Returns { exists: true, record } or { exists: false, record: null }.
   */
  async get(
    tenantId: string,
    gardenId: number,
    date: string,
  ): Promise<{ exists: boolean; record: any }> {
    const dateObj = this.parseDate(date);

    const garden = await this.prisma.garden.findFirst({
      where: { id: gardenId, tenantId },
    });
    if (!garden) {
      throw new NotFoundException(`Garden with ID ${gardenId} not found`);
    }

    const existing = await this.prisma.dailyFieldCheck.findUnique({
      where: {
        gardenId_date: { gardenId, date: dateObj },
      },
      include: {
        garden: { include: { campus: true } },
        createdBy: {
          select: { id: true, username: true, displayName: true, role: true },
        },
      },
    });

    if (existing) {
      return { exists: true, record: this.toResponse(existing) };
    }
    return { exists: false, record: null };
  }

  /**
   * Upsert draft for garden+date. Create if not exists; update if draft.
   * Returns the saved record.
   */
  async upsertDraft(
    tenantId: string,
    gardenId: number,
    date: string,
    createdById: number,
    answers: Record<string, unknown> = {},
  ) {
    const dateObj = this.parseDate(date);

    const garden = await this.prisma.garden.findFirst({
      where: { id: gardenId, tenantId },
    });
    if (!garden) {
      throw new NotFoundException(`Garden with ID ${gardenId} not found`);
    }

    const existing = await this.prisma.dailyFieldCheck.findUnique({
      where: { gardenId_date: { gardenId, date: dateObj } },
      include: {
        garden: { include: { campus: true } },
        createdBy: {
          select: { id: true, username: true, displayName: true, role: true },
        },
      },
    });

    if (existing) {
      if (existing.status === DailyFieldCheckStatus.SUBMITTED) {
        throw new BadRequestException('Cannot update submitted daily field check');
      }
      const updated = await this.prisma.dailyFieldCheck.update({
        where: { id: existing.id },
        data: { answers: (answers || {}) as object, updatedAt: new Date() },
        include: {
          garden: { include: { campus: true } },
          createdBy: {
            select: { id: true, username: true, displayName: true, role: true },
          },
        },
      });
      return this.toResponse(updated);
    }

    const created = await this.prisma.dailyFieldCheck.create({
      data: {
        tenantId,
        gardenId,
        createdById,
        date: dateObj,
        status: DailyFieldCheckStatus.DRAFT,
        answers: (answers || {}) as object,
      },
      include: {
        garden: { include: { campus: true } },
        createdBy: {
          select: { id: true, username: true, displayName: true, role: true },
        },
      },
    });
    return this.toResponse(created);
  }

  async findOne(tenantId: string, id: string) {
    const record = await this.prisma.dailyFieldCheck.findFirst({
      where: { id, tenantId },
      include: {
        garden: { include: { campus: true } },
        createdBy: {
          select: { id: true, username: true, displayName: true, role: true },
        },
      },
    });
    if (!record) {
      throw new NotFoundException(`Daily field check with ID ${id} not found`);
    }
    return this.toResponse(record);
  }

  async update(
    tenantId: string,
    id: string,
    patch: { answers?: Record<string, unknown> },
  ) {
    const existing = await this.prisma.dailyFieldCheck.findFirst({
      where: { id, tenantId },
    });
    if (!existing) {
      throw new NotFoundException(`Daily field check with ID ${id} not found`);
    }
    if (existing.status !== DailyFieldCheckStatus.DRAFT) {
      throw new BadRequestException('Only draft can be updated');
    }

    const updated = await this.prisma.dailyFieldCheck.update({
      where: { id },
      data: {
        ...(patch.answers !== undefined && { answers: patch.answers as any }),
      },
      include: {
        garden: { include: { campus: true } },
        createdBy: {
          select: { id: true, username: true, displayName: true, role: true },
        },
      },
    });
    return this.toResponse(updated);
  }

  async submit(tenantId: string, id: string) {
    const existing = await this.prisma.dailyFieldCheck.findFirst({
      where: { id, tenantId },
    });
    if (!existing) {
      throw new NotFoundException(`Daily field check with ID ${id} not found`);
    }
    if (existing.status !== DailyFieldCheckStatus.DRAFT) {
      throw new BadRequestException('Only draft can be submitted');
    }

    const updated = await this.prisma.dailyFieldCheck.update({
      where: { id },
      data: {
        status: DailyFieldCheckStatus.SUBMITTED,
        submittedAt: new Date(),
      },
      include: {
        garden: { include: { campus: true } },
        createdBy: {
          select: { id: true, username: true, displayName: true, role: true },
        },
      },
    });
    return this.toResponse(updated);
  }

  /** Delete by gardenId+date (for gardens route) */
  async deleteByDate(
    tenantId: string,
    gardenId: number,
    date: string,
    userId?: number,
    userRole?: string,
  ) {
    const dateObj = this.parseDate(date);
    const existing = await this.prisma.dailyFieldCheck.findUnique({
      where: { gardenId_date: { gardenId, date: dateObj } },
    });
    if (!existing) {
      throw new NotFoundException('Daily field check not found for this date');
    }
    return this.delete(tenantId, existing.id, userId, userRole);
  }

  async delete(tenantId: string, id: string, userId?: number, userRole?: string) {
    const existing = await this.prisma.dailyFieldCheck.findFirst({
      where: { id, tenantId },
    });
    if (!existing) {
      throw new NotFoundException(`Daily field check with ID ${id} not found`);
    }
    if (userRole === 'CONSULTANT') {
      if (existing.createdById !== userId) {
        throw new BadRequestException('You can only delete your own draft');
      }
    }

    await this.prisma.dailyFieldCheck.delete({ where: { id } });
    return { success: true };
  }

  async list(
    tenantId: string,
    gardenId?: number,
    limit = 20,
  ) {
    const where: any = { tenantId };
    if (gardenId != null) where.gardenId = gardenId;
    const rows = await this.prisma.dailyFieldCheck.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        garden: { include: { campus: true } },
        createdBy: {
          select: { id: true, username: true, displayName: true, role: true },
        },
      },
    });
    return rows.map((r) => this.toResponse(r));
  }

  private toResponse(record: any) {
    return {
      id: record.id,
      tenantId: record.tenantId,
      gardenId: record.gardenId,
      createdById: record.createdById,
      date: record.date,
      status: record.status,
      answers: record.answers,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      submittedAt: record.submittedAt,
      garden: record.garden,
      createdBy: record.createdBy,
    };
  }
}
