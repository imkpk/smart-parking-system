import { Injectable } from '@nestjs/common';
import {
  ParkingLotVisibility,
  Prisma,
  SlotStatus,
  SlotType,
  VehicleType,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PublicParkingFinderQueryDto } from './dto/public-parking-finder-query.dto';
import {
  AvailabilityType,
  PublicParkingFinderResult,
} from './public-parking-finder.types';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

function decimalToString(value: Prisma.Decimal | null | undefined): string | null {
  if (value == null) {
    return null;
  }
  return value.toString();
}

function vehicleTypeToSlotType(vehicleType: VehicleType): SlotType {
  return vehicleType as unknown as SlotType;
}

function haversineDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

@Injectable()
export class PublicParkingFinderService {
  constructor(private readonly prisma: PrismaService) {}

  async findPublicLots(
    query: PublicParkingFinderQueryDto,
  ): Promise<PublicParkingFinderResult[]> {
    const limit = Math.min(query.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
    const slotTypeFilter = query.vehicleType
      ? vehicleTypeToSlotType(query.vehicleType)
      : undefined;

    const lots = await this.prisma.parkingLot.findMany({
      where: {
        isActive: true,
        visibility: ParkingLotVisibility.PUBLIC,
        organization: { isActive: true },
        ...(query.city
          ? {
              city: {
                contains: query.city.trim(),
                mode: 'insensitive',
              },
            }
          : {}),
      },
      include: {
        organization: { select: { name: true } },
        floors: {
          include: {
            slots: {
              where: slotTypeFilter ? { slotType: slotTypeFilter } : undefined,
              select: { status: true },
            },
          },
        },
      },
      take: limit * 3,
      orderBy: [{ city: 'asc' }, { name: 'asc' }, { id: 'asc' }],
    });

    const results = lots.map((lot) => this.toPublicResult(lot, query, slotTypeFilter));

    if (query.lat != null && query.lng != null) {
      return results
        .map((result) => {
          if (result.latitude == null || result.longitude == null) {
            return { ...result, distanceKm: null };
          }
          const distanceKm = haversineDistanceKm(
            query.lat!,
            query.lng!,
            Number(result.latitude),
            Number(result.longitude),
          );
          return { ...result, distanceKm: Number(distanceKm.toFixed(2)) };
        })
        .sort((left, right) => {
          if (left.distanceKm == null && right.distanceKm == null) {
            return left.id - right.id;
          }
          if (left.distanceKm == null) {
            return 1;
          }
          if (right.distanceKm == null) {
            return -1;
          }
          return left.distanceKm - right.distanceKm;
        })
        .slice(0, limit);
    }

    return results.slice(0, limit);
  }

  private toPublicResult(
    lot: {
      id: number;
      name: string;
      type: PublicParkingFinderResult['type'];
      address: string | null;
      city: string | null;
      state: string | null;
      pincode: string | null;
      latitude: Prisma.Decimal | null;
      longitude: Prisma.Decimal | null;
      baseHourlyRate: Prisma.Decimal | null;
      currency: string | null;
      openingHours: string | null;
      organization: { name: string };
      floors: Array<{ slots: Array<{ status: SlotStatus }> }>;
    },
    _query: PublicParkingFinderQueryDto,
    _slotTypeFilter?: SlotType,
  ): PublicParkingFinderResult {
    const slots = lot.floors.flatMap((floor) => floor.slots);
    const totalSlots = slots.length;
    const availableSlots = slots.filter((slot) => slot.status === SlotStatus.AVAILABLE).length;
    const availabilityType: AvailabilityType = totalSlots > 0 ? 'LIVE' : 'UNKNOWN';

    return {
      id: lot.id,
      name: lot.name,
      organizationName: lot.organization.name,
      type: lot.type,
      address: lot.address,
      city: lot.city,
      state: lot.state,
      pincode: lot.pincode,
      latitude: decimalToString(lot.latitude),
      longitude: decimalToString(lot.longitude),
      baseHourlyRate: decimalToString(lot.baseHourlyRate),
      currency: lot.currency,
      openingHours: lot.openingHours,
      totalSlots,
      availableSlots,
      availabilityType,
      bookable: availableSlots > 0,
    };
  }
}