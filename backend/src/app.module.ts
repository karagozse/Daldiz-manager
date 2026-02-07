import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
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
export class AppModule {}
