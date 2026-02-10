import {
  Controller,
  Post,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { randomUUID } from 'crypto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role } from '@prisma/client';
import { Tenant } from '../common/decorators/tenant.decorator';
import { TenantContext } from '../middleware/tenant-context.middleware';
import { PrismaService } from '../prisma/prisma.service';

const UPLOAD_DIR = join(process.cwd(), 'uploads');

function ensureUploadDir(base: string) {
  if (!existsSync(base)) {
    mkdirSync(base, { recursive: true });
  }
}

const imageFileFilter = (_req: any, file: { mimetype: string }, cb: (err: Error | null, accept?: boolean) => void) => {
  const allowed = /^image\/(jpeg|jpg|png|gif|webp|heic)$/i;
  if (allowed.test(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new BadRequestException('Invalid file type. Use image (jpeg/png/gif/webp/heic).') as any, false);
  }
};

@Controller('uploads')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.CONSULTANT, Role.LEAD_AUDITOR, Role.ADMIN, Role.SUPER_ADMIN)
export class UploadsController {
  constructor(private readonly prisma: PrismaService) {}

  @Post('inspection-photo/:inspectionId/:topicId')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          ensureUploadDir(UPLOAD_DIR);
          const subdir = join(UPLOAD_DIR, 'inspections');
          ensureUploadDir(subdir);
          cb(null, subdir);
        },
        filename: (req, file, cb) => {
          const inspectionId = req.params?.inspectionId || 'unknown';
          const topicId = req.params?.topicId || '0';
          const ext = file.originalname?.match(/\.[^.]+$/)?.[0] || '.jpg';
          cb(null, `${inspectionId}_${topicId}${ext}`);
        },
      }),
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
      fileFilter: imageFileFilter,
    }),
  )
  async uploadInspectionPhoto(
    @Param('inspectionId') inspectionId: string,
    @Param('topicId') topicId: string,
    @UploadedFile() file: { filename: string; originalname?: string } | undefined,
    @Tenant() tenant: TenantContext,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    // Verify inspection exists and belongs to tenant
    const inspection = await this.prisma.inspection.findFirst({
      where: { id: inspectionId, tenantId: tenant.tenantId },
    });
    if (!inspection) {
      throw new BadRequestException(`Inspection ${inspectionId} not found`);
    }
    // Return URL path that frontend can use (relative path served as static)
    const url = `/uploads/inspections/${file.filename}`;
    return { url };
  }

  @Post('harvest-photo/:harvestId')
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      storage: diskStorage({
        destination: (req, _file, cb) => {
          ensureUploadDir(UPLOAD_DIR);
          const subdir = join(UPLOAD_DIR, 'harvests', req.params?.harvestId || 'unknown');
          ensureUploadDir(subdir);
          cb(null, subdir);
        },
        filename: (_req, file, cb) => {
          const ext = file.originalname?.match(/\.[^.]+$/)?.[0] || '.jpg';
          cb(null, `${randomUUID()}${ext}`);
        },
      }),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: imageFileFilter,
    }),
  )
  async uploadHarvestPhotos(
    @Param('harvestId') harvestId: string,
    @Query('category') category: string,
    @UploadedFiles() files: Array<{ filename: string }>,
    @Tenant() tenant: TenantContext,
    @CurrentUser() user: { role: Role },
  ) {
    if (!category || !['GENERAL', 'TRADER_SLIP'].includes(category)) {
      throw new BadRequestException('Query param category must be GENERAL or TRADER_SLIP');
    }
    const harvest = await this.prisma.harvestEntry.findFirst({
      where: { id: harvestId, tenantId: tenant.tenantId },
    });
    if (!harvest) {
      throw new BadRequestException(`Harvest ${harvestId} not found`);
    }
    const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';
    if (harvest.status !== 'draft' && !(harvest.status === 'submitted' && isAdmin)) {
      throw new BadRequestException('Only draft harvest entries can receive photo uploads (or admin revize)');
    }
    if (!files?.length) {
      throw new BadRequestException('No files uploaded');
    }
    const baseUrl = `/uploads/harvests/${harvestId}`;
    const created = await Promise.all(
      files.map((f) =>
        this.prisma.harvestPhoto.create({
          data: {
            harvestId,
            category,
            url: `${baseUrl}/${f.filename}`,
          },
        }),
      ),
    );
    return { photos: created.map((p) => ({ id: p.id, url: p.url, category: p.category })) };
  }
}
