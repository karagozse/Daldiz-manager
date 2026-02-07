import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TenantContextMiddleware } from './middleware/tenant-context.middleware';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CampusesModule } from './campuses/campuses.module';
import { GardensModule } from './gardens/gardens.module';
import { InspectionsModule } from './inspections/inspections.module';
import { CriticalWarningsModule } from './critical-warnings/critical-warnings.module';
import { UploadsModule } from './uploads/uploads.module';
import { PrescriptionsModule } from './prescriptions/prescriptions.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  controllers: [AppController],
  providers: [TenantContextMiddleware],
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    CampusesModule,
    GardensModule,
    InspectionsModule,
    CriticalWarningsModule,
    UploadsModule,
    PrescriptionsModule,
    NotificationsModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantContextMiddleware).forRoutes('*');
  }
}
