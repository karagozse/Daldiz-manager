import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TradersService } from '../traders/traders.service';
import { CreateHarvestDto } from './dto/create-harvest.dto';
import { UpdateHarvestDto } from './dto/update-harvest.dto';
import { Decimal } from '@prisma/client/runtime/library';

function toNum(v: Decimal | null | undefined): number | null {
  if (v == null) return null;
  return Number(v);
}

function formatDateForName(d: Date): string {
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
}

/**
 * Compute draft name: "DD.MM.YYYY - N. Araba"
 * N = next available number (1-based) for that date among all entries (draft + submitted).
 */
async function computeDraftName(
  prisma: PrismaService,
  tenantId: string,
  date: Date,
  excludeId?: string,
): Promise<string> {
  const dateStart = new Date(date);
  dateStart.setUTCHours(0, 0, 0, 0);
  const dateEnd = new Date(dateStart);
  dateEnd.setUTCDate(dateEnd.getUTCDate() + 1);

  const sameDay = await prisma.harvestEntry.findMany({
    where: {
      tenantId,
      date: {
        gte: dateStart,
        lt: dateEnd,
      },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { name: true },
  });

  const prefix = formatDateForName(date) + ' - ';
  const suffix = '. Araba';
  const used: number[] = [];
  for (const row of sameDay) {
    const n = row.name.startsWith(prefix) && row.name.endsWith(suffix)
      ? parseInt(row.name.slice(prefix.length, row.name.length - suffix.length), 10)
      : NaN;
    if (!Number.isNaN(n) && n >= 1) used.push(n);
  }
  used.sort((a, b) => a - b);
  let n = 1;
  for (const u of used) {
    if (u > n) break;
    n = u + 1;
  }
  return `${prefix}${n}${suffix}`;
}

function mapEntry(e: any) {
  return {
    id: e.id,
    tenantId: e.tenantId,
    gardenId: e.gardenId,
    traderId: e.traderId ?? null,
    traderName: e.traderName ?? '',
    date: e.date,
    name: e.name,
    status: e.status,
    pricePerKg: toNum(e.pricePerKg),
    grade1Kg: toNum(e.grade1Kg),
    grade2Kg: toNum(e.grade2Kg),
    thirdLabel: e.thirdLabel ?? null,
    thirdKg: toNum(e.thirdKg),
    thirdPricePerKg: toNum(e.thirdPricePerKg),
    independentScaleFullKg: toNum(e.independentScaleFullKg),
    independentScaleEmptyKg: toNum(e.independentScaleEmptyKg),
    traderScaleFullKg: toNum(e.traderScaleFullKg),
    traderScaleEmptyKg: toNum(e.traderScaleEmptyKg),
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
    submittedAt: e.submittedAt,
    garden: e.garden,
    photos: e.photos?.map((p: any) => ({ id: p.id, category: p.category, url: p.url, createdAt: p.createdAt })) ?? [],
  };
}

@Injectable()
export class HarvestService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tradersService: TradersService,
  ) {}

  async create(dto: CreateHarvestDto, tenantId: string) {
    const garden = await this.prisma.garden.findFirst({
      where: { id: dto.gardenId, tenantId },
    });
    if (!garden) {
      throw new NotFoundException(`Garden with ID ${dto.gardenId} not found`);
    }

    const traderName = (dto.traderName ?? '').trim() || '—';
    const trader = await this.tradersService.findOrCreateByName(tenantId, traderName);

    const date = new Date(dto.date);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('Invalid date');
    }
    const name = await computeDraftName(this.prisma, tenantId, date);

    const entry = await this.prisma.harvestEntry.create({
      data: {
        tenantId,
        gardenId: dto.gardenId,
        traderId: trader.id,
        traderName: trader.name,
        date,
        name,
        status: 'draft',
        pricePerKg: dto.pricePerKg ?? 0,
        grade1Kg: dto.grade1Kg != null ? dto.grade1Kg : null,
        grade2Kg: dto.grade2Kg != null ? dto.grade2Kg : null,
        thirdLabel: dto.thirdLabel ?? null,
        thirdKg: dto.thirdKg != null ? dto.thirdKg : null,
        thirdPricePerKg: dto.thirdPricePerKg != null ? dto.thirdPricePerKg : null,
        independentScaleFullKg: dto.independentScaleFullKg != null ? dto.independentScaleFullKg : null,
        independentScaleEmptyKg: dto.independentScaleEmptyKg != null ? dto.independentScaleEmptyKg : null,
        traderScaleFullKg: dto.traderScaleFullKg != null ? dto.traderScaleFullKg : null,
        traderScaleEmptyKg: dto.traderScaleEmptyKg != null ? dto.traderScaleEmptyKg : null,
      },
      include: {
        garden: { include: { campus: true } },
        photos: true,
      },
    });

    return mapEntry(entry);
  }

  async findAll(
    tenantId: string,
    filters?: { dateFrom?: string; dateTo?: string; status?: string; gardenId?: number },
  ) {
    const where: any = { tenantId };
    if (filters?.gardenId != null) {
      where.gardenId = filters.gardenId;
    }
    if (filters?.status) {
      where.status = filters.status;
    }
    if (filters?.dateFrom || filters?.dateTo) {
      where.date = {};
      if (filters.dateFrom) {
        where.date.gte = new Date(filters.dateFrom);
      }
      if (filters.dateTo) {
        where.date.lte = new Date(filters.dateTo);
      }
    }

    const list = await this.prisma.harvestEntry.findMany({
      where,
      include: {
        garden: { include: { campus: true } },
        photos: true,
      },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      take: 50,
    });

    return list.map(mapEntry);
  }

  /** Summary for icmal: only submitted, with optional year/campusId/gardenId/trader. */
  async findSummary(
    tenantId: string,
    filters: { year?: number; campusId?: string; gardenId?: number; trader?: string },
  ) {
    const where: any = { tenantId, status: 'submitted' };
    if (filters.year != null) {
      where.date = {
        gte: new Date(filters.year, 0, 1),
        lt: new Date(filters.year + 1, 0, 1),
      };
    }
    if (filters.gardenId != null) {
      where.gardenId = filters.gardenId;
    }
    if (filters.campusId != null) {
      where.garden = { campusId: filters.campusId };
    }
    if (filters.trader != null && filters.trader !== '') {
      where.traderName = { contains: filters.trader, mode: 'insensitive' };
    }
    const list = await this.prisma.harvestEntry.findMany({
      where,
      include: { garden: { include: { campus: true } } },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      take: 500,
    });
    const rows = list.map((e) => {
      const g1 = toNum(e.grade1Kg) ?? 0;
      const g2 = toNum(e.grade2Kg) ?? 0;
      const totalKg = g1 + g2;
      const price = toNum(e.pricePerKg) ?? 0;
      const grade1Total = g1 * price;
      const grade2Total = g2 * (price / 2);
      const netTotal = grade1Total + grade2Total;
      const full = toNum(e.independentScaleFullKg);
      const empty = toNum(e.independentScaleEmptyKg);
      const scaleDiff = full != null && empty != null ? full - empty : null;
      const secondRatio = totalKg > 0 ? (g2 / totalKg) * 100 : null;
      const scaleGap = scaleDiff != null && totalKg > 0 ? scaleDiff - totalKg : null;
      const scaleDiffPct =
        scaleDiff != null && scaleDiff > 0 && scaleGap != null
          ? (Math.abs(scaleGap) / scaleDiff) * 100
          : null;
      const totalAmount = price > 0 ? netTotal : null;
      return {
        id: e.id,
        harvest_date: e.date,
        trader_name: (e as any).traderName ?? '',
        total_kg: totalKg,
        sale_price: price,
        total_amount: totalAmount,
        garden_name: e.garden?.name ?? '',
        campus_name: e.garden?.campus?.name ?? '',
        grade1_kg: g1,
        grade2_kg: g2,
        scale_full_kg: full,
        scale_empty_kg: empty,
        scale_diff: scaleDiff,
        second_ratio: secondRatio,
        scale_gap: scaleGap,
        scale_diff_pct: scaleDiffPct,
        grade1_total: grade1Total,
        grade2_total: grade2Total,
        net_total: netTotal,
      };
    });
    const sumGrade1 = rows.reduce((s, r) => s + r.grade1_kg, 0);
    const sumGrade2 = rows.reduce((s, r) => s + r.grade2_kg, 0);
    const sumTotalKg = rows.reduce((s, r) => s + r.total_kg, 0);
    const sumFull = rows.reduce((s, r) => s + (r.scale_full_kg ?? 0), 0);
    const sumEmpty = rows.reduce((s, r) => s + (r.scale_empty_kg ?? 0), 0);
    const sumScaleDiff = sumFull - sumEmpty;
    const secondRatioTotal = sumTotalKg > 0 ? (sumGrade2 / sumTotalKg) * 100 : null;
    const sumScaleGap = sumTotalKg > 0 ? sumScaleDiff - sumTotalKg : null;
    const sumGrade1Total = rows.reduce((s, r) => s + r.grade1_total, 0);
    const sumGrade2Total = rows.reduce((s, r) => s + r.grade2_total, 0);
    const sumNetTotal = rows.reduce((s, r) => s + r.net_total, 0);
    const avgPrice = sumTotalKg > 0 ? sumNetTotal / sumTotalKg : null;
    return {
      rows,
      totals: {
        sum_grade1: sumGrade1,
        sum_grade2: sumGrade2,
        sum_total_kg: sumTotalKg,
        sum_full: sumFull,
        sum_empty: sumEmpty,
        sum_scale_diff: sumScaleDiff,
        second_ratio_total: secondRatioTotal,
        sum_scale_gap: sumScaleGap,
        avg_price: avgPrice,
        sum_grade1_total: sumGrade1Total,
        sum_grade2_total: sumGrade2Total,
        sum_net_total: sumNetTotal,
      },
    };
  }

  /** List all trader names for filter dropdown (GET /harvest/traders?list=all). */
  async listAllTraderNames(tenantId: string): Promise<{ name: string }[]> {
    const list = await this.tradersService.listAll(tenantId);
    return list.map((t) => ({ name: t.name }));
  }

  /** Autocomplete from traders table (GET /harvest/traders?q=). Top 10, ILIKE. */
  async findTraderNames(tenantId: string, q: string): Promise<{ name: string }[]> {
    const list = await this.tradersService.search(tenantId, q ?? '');
    return list.map((t) => ({ name: t.name }));
  }

  async findOne(tenantId: string, id: string) {
    const entry = await this.prisma.harvestEntry.findFirst({
      where: { id, tenantId },
      include: {
        garden: { include: { campus: true } },
        photos: true,
      },
    });
    if (!entry) {
      throw new NotFoundException(`Harvest entry with ID ${id} not found`);
    }
    return mapEntry(entry);
  }

  async update(tenantId: string, id: string, dto: UpdateHarvestDto) {
    const existing = await this.prisma.harvestEntry.findFirst({
      where: { id, tenantId },
    });
    if (!existing) {
      throw new NotFoundException(`Harvest entry with ID ${id} not found`);
    }
    if (existing.status !== 'draft') {
      throw new BadRequestException('Only draft harvest entries can be updated');
    }

    const data: any = {};
    if (dto.date != null) {
      const dateObj = new Date(dto.date);
      if (Number.isNaN(dateObj.getTime())) {
        throw new BadRequestException('Invalid date');
      }
      data.date = dateObj;
      data.name = await computeDraftName(this.prisma, tenantId, dateObj, id);
    }
    if (dto.gardenId != null) {
      const garden = await this.prisma.garden.findFirst({
        where: { id: dto.gardenId, tenantId },
      });
      if (!garden) {
        throw new NotFoundException(`Garden with ID ${dto.gardenId} not found`);
      }
      data.gardenId = dto.gardenId;
    }
    if (dto.traderName != null && String(dto.traderName).trim() !== '') {
      const trader = await this.tradersService.findOrCreateByName(tenantId, String(dto.traderName).trim());
      data.traderId = trader.id;
      data.traderName = trader.name;
    }
    if (dto.pricePerKg != null) data.pricePerKg = dto.pricePerKg;
    if (dto.grade1Kg !== undefined) data.grade1Kg = dto.grade1Kg;
    if (dto.grade2Kg !== undefined) data.grade2Kg = dto.grade2Kg;
    if (dto.thirdLabel !== undefined) data.thirdLabel = dto.thirdLabel;
    if (dto.thirdKg !== undefined) data.thirdKg = dto.thirdKg;
    if (dto.thirdPricePerKg !== undefined) data.thirdPricePerKg = dto.thirdPricePerKg;
    if (dto.independentScaleFullKg !== undefined) data.independentScaleFullKg = dto.independentScaleFullKg;
    if (dto.independentScaleEmptyKg !== undefined) data.independentScaleEmptyKg = dto.independentScaleEmptyKg;
    if (dto.traderScaleFullKg !== undefined) data.traderScaleFullKg = dto.traderScaleFullKg;
    if (dto.traderScaleEmptyKg !== undefined) data.traderScaleEmptyKg = dto.traderScaleEmptyKg;

    const updated = await this.prisma.harvestEntry.update({
      where: { id },
      data,
      include: {
        garden: { include: { campus: true } },
        photos: true,
      },
    });

    return mapEntry(updated);
  }

  async submit(tenantId: string, id: string) {
    const entry = await this.prisma.harvestEntry.findFirst({
      where: { id, tenantId },
      include: { photos: true },
    });
    if (!entry) {
      throw new NotFoundException(`Harvest entry with ID ${id} not found`);
    }
    if (entry.status !== 'draft') {
      throw new BadRequestException('Only draft harvest entries can be submitted');
    }

    const errors: string[] = [];
    const fields: string[] = [];
    const grade1 = toNum(entry.grade1Kg);
    const grade2 = toNum(entry.grade2Kg);
    if (!entry.date) {
      errors.push('Tarih eksik.');
      fields.push('date');
    }
    if (entry.gardenId == null) {
      errors.push('Bahçe seçimi eksik.');
      fields.push('garden_id');
    }
    const tn = (entry as any).traderName ?? '';
    if (!tn || String(tn).trim() === '') {
      errors.push('Tüccar adı zorunludur.');
      fields.push('trader_name');
    }
    if (toNum(entry.pricePerKg) == null || Number(entry.pricePerKg) <= 0) {
      errors.push('Satış fiyatı (kg) zorunludur ve 0\'dan büyük olmalıdır.');
      fields.push('sale_price');
    }
    if (grade1 === null || grade1 === undefined) {
      errors.push('1. sınıf kg zorunludur.');
      fields.push('grade1_kg');
    }
    if (grade2 === null || grade2 === undefined) {
      errors.push('2. sınıf kg zorunludur.');
      fields.push('grade2_kg');
    }
    const traderSlipPhotos = entry.photos?.filter((p: any) => p.category === 'TRADER_SLIP') ?? [];
    if (traderSlipPhotos.length === 0) {
      errors.push('En az bir tüccar fişi fotoğrafı yüklenmelidir.');
      fields.push('trader_receipt_photo');
    }
    const thirdKg = toNum(entry.thirdKg);
    if (thirdKg != null && thirdKg > 0) {
      const thirdPrice = toNum(entry.thirdPricePerKg);
      if (thirdPrice == null || thirdPrice < 0) {
        errors.push('3. sınıflandırma kg girildiyse fiyat (kg) zorunludur.');
        fields.push('third_price_per_kg');
      }
    }

    if (errors.length > 0) {
      throw new BadRequestException({ message: errors.join(' '), fields });
    }

    const updated = await this.prisma.harvestEntry.update({
      where: { id },
      data: {
        status: 'submitted',
        submittedAt: new Date(),
      },
      include: {
        garden: { include: { campus: true } },
        photos: true,
      },
    });

    return mapEntry(updated);
  }

  async delete(tenantId: string, id: string) {
    const entry = await this.prisma.harvestEntry.findFirst({
      where: { id, tenantId },
    });
    if (!entry) {
      throw new NotFoundException(`Harvest entry with ID ${id} not found`);
    }
    if (entry.status !== 'draft') {
      throw new BadRequestException('Only draft harvest entries can be deleted');
    }
    await this.prisma.harvestEntry.delete({ where: { id } });
    return { success: true };
  }

  async deletePhoto(tenantId: string, harvestId: string, photoId: string) {
    const harvest = await this.prisma.harvestEntry.findFirst({
      where: { id: harvestId, tenantId },
    });
    if (!harvest) {
      throw new NotFoundException(`Harvest ${harvestId} not found`);
    }
    if (harvest.status !== 'draft') {
      throw new BadRequestException('Only draft harvest entries can have photos removed');
    }
    const photo = await this.prisma.harvestPhoto.findFirst({
      where: { id: photoId, harvestId },
    });
    if (!photo) {
      throw new NotFoundException(`Photo ${photoId} not found`);
    }
    await this.prisma.harvestPhoto.delete({ where: { id: photoId } });
    return { success: true };
  }
}
