import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AssignmentsModule } from './assignments/assignments.module';
import { CommonModule } from './common/common.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { BookingsModule } from './bookings/bookings.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { FloorsModule } from './floors/floors.module';
import { ParkingEventsModule } from './parking-events/parking-events.module';
import { ParkingLotsModule } from './parking-lots/parking-lots.module';
import { PrismaModule } from './prisma/prisma.module';
import { SlotsModule } from './slots/slots.module';
import { UsersModule } from './users/users.module';
import { VehiclesModule } from './vehicles/vehicles.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    CommonModule,
    AuthModule,
    BookingsModule,
    UsersModule,
    VehiclesModule,
    ParkingLotsModule,
    FloorsModule,
    SlotsModule,
    AssignmentsModule,
    ParkingEventsModule,
    DashboardModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
