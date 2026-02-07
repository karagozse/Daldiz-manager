import {
  Controller,
  Post,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
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

@Controller('uploads')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.CONSULTANT, Role.LEAD_AUDITOR, Role.SUPER_ADMIN)
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
      fileFilter: (_req, file, cb) => {
        const allowed = /^image\/(jpeg|jpg|png|gif|webp|heic)$/i;
        if (allowed.test(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new BadRequestException('Invalid file type. Use image (jpeg/png/gif/webp/heic).'), false);
        }
      },
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
}
