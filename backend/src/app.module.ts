import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AssignmentsModule } from './assignments/assignments.module';
import { CommonModule } from './common/common.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { BookingsModule } from './bookings/bookings.module';
import { ConversationsModule } from './conversations/conversations.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { EventsModule } from './events/events.module';
import { FloorsModule } from './floors/floors.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { ParkingEventsModule } from './parking-events/parking-events.module';
import { ParkingLotsModule } from './parking-lots/parking-lots.module';
import { PublicParkingFinderModule } from './public-parking-finder/public-parking-finder.module';
import { PrismaModule } from './prisma/prisma.module';
import { SecurityModule } from './security/security.module';
import { SlotsModule } from './slots/slots.module';
import { UsersModule } from './users/users.module';
import { VehiclesModule } from './vehicles/vehicles.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: Number(process.env.THROTTLE_LIMIT ?? 120),
      },
    ]),
    PrismaModule,
    CommonModule,
    AuthModule,
    BookingsModule,
    ConversationsModule,
    UsersModule,
    VehiclesModule,
    ParkingLotsModule,
    PublicParkingFinderModule,
    FloorsModule,
    SlotsModule,
    AssignmentsModule,
    OrganizationsModule,
    ParkingEventsModule,
    DashboardModule,
    EventsModule,
    SecurityModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
