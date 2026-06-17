import { BookingStatus, ParkingLotType, SlotStatus, SlotType, VehicleType } from '@prisma/client';
import {
  DEFAULT_ORGANIZATION_ID,
  OTHER_ORGANIZATION_ID,
} from '../organizations/organizations.constants';
import {
  adminUser,
  adminUserOrg2,
  normalUser,
  normalUserOrg2,
  securityUser,
  securityUserOrg2,
} from './test-users';

export const org1 = {
  organizationId: DEFAULT_ORGANIZATION_ID,
  adminUser,
  normalUser,
  securityUser,
  parkingLot: {
    id: 1,
    name: 'Org1 Lot',
    type: ParkingLotType.APARTMENT,
    organizationId: DEFAULT_ORGANIZATION_ID,
    isActive: true,
  },
  floor: {
    id: 10,
    parkingLotId: 1,
    name: 'Level 1',
    level: 1,
  },
  slot: {
    id: 20,
    floorId: 10,
    slotNumber: 'A-01',
    slotType: SlotType.CAR,
    status: SlotStatus.AVAILABLE,
    floor: {
      parkingLotId: 1,
      parkingLot: {
        id: 1,
        organizationId: DEFAULT_ORGANIZATION_ID,
        isActive: true,
      },
    },
  },
  vehicle: {
    id: 100,
    userId: normalUser.id,
    organizationId: DEFAULT_ORGANIZATION_ID,
    vehicleNumber: 'TS09EA1234',
    vehicleType: VehicleType.CAR,
  },
  booking: {
    id: 200,
    bookingCode: 'BK-ORG1',
    organizationId: DEFAULT_ORGANIZATION_ID,
    userId: normalUser.id,
    vehicleId: 100,
    slotId: 20,
    parkingLotId: 1,
    status: BookingStatus.CONFIRMED,
  },
  parkingEvent: {
    id: 300,
    organizationId: DEFAULT_ORGANIZATION_ID,
    bookingId: 200,
    userId: normalUser.id,
    vehicleId: 100,
    slotId: 20,
    parkingLotId: 1,
    status: BookingStatus.CONFIRMED,
  },
};

export const org2 = {
  organizationId: OTHER_ORGANIZATION_ID,
  adminUser: adminUserOrg2,
  normalUser: normalUserOrg2,
  securityUser: securityUserOrg2,
  parkingLot: {
    id: 2,
    name: 'Org2 Lot',
    type: ParkingLotType.APARTMENT,
    organizationId: OTHER_ORGANIZATION_ID,
    isActive: true,
  },
  floor: {
    id: 20,
    parkingLotId: 2,
    name: 'Level 1',
    level: 1,
  },
  slot: {
    id: 30,
    floorId: 20,
    slotNumber: 'B-01',
    slotType: SlotType.CAR,
    status: SlotStatus.AVAILABLE,
    floor: {
      parkingLotId: 2,
      parkingLot: {
        id: 2,
        organizationId: OTHER_ORGANIZATION_ID,
        isActive: true,
      },
    },
  },
  vehicle: {
    id: 110,
    userId: normalUserOrg2.id,
    organizationId: OTHER_ORGANIZATION_ID,
    vehicleNumber: 'TS09EB5678',
    vehicleType: VehicleType.CAR,
  },
  booking: {
    id: 210,
    bookingCode: 'BK-ORG2',
    organizationId: OTHER_ORGANIZATION_ID,
    userId: normalUserOrg2.id,
    vehicleId: 110,
    slotId: 30,
    parkingLotId: 2,
    status: BookingStatus.CONFIRMED,
  },
  parkingEvent: {
    id: 310,
    organizationId: OTHER_ORGANIZATION_ID,
    bookingId: 210,
    userId: normalUserOrg2.id,
    vehicleId: 110,
    slotId: 30,
    parkingLotId: 2,
    status: BookingStatus.CONFIRMED,
  },
};