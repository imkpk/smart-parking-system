import { ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { SafeUser } from '../users/types/safe-user.type';

@Injectable()
export class AccessPolicyService {
  isSuperAdmin(user: SafeUser) {
    return user.role === Role.SUPER_ADMIN;
  }

  isTenantAdmin(user: SafeUser) {
    return user.role === Role.TENANT_ADMIN;
  }

  isAdmin(user: SafeUser) {
    return user.role === Role.ADMIN;
  }

  isTenantManager(user: SafeUser) {
    return this.isTenantAdmin(user) || this.isAdmin(user);
  }

  isSecurity(user: SafeUser) {
    return user.role === Role.SECURITY;
  }

  isUser(user: SafeUser) {
    return user.role === Role.USER;
  }

  isOperationalRole(user: SafeUser) {
    return this.isTenantManager(user) || this.isSecurity(user);
  }

  getRequiredOrganizationId(currentUser: SafeUser): number {
    if (currentUser.organizationId == null) {
      throw new ForbiddenException('Organization context is required');
    }

    return currentUser.organizationId;
  }

  canAccessOrganization(currentUser: SafeUser, organizationId: number) {
    if (currentUser.organizationId == null) {
      return false;
    }

    return currentUser.organizationId === organizationId;
  }

  assertSameOrganization(
    currentUser: SafeUser,
    recordOrganizationId: number,
    message = 'Cross-organization access is not allowed',
  ) {
    if (!this.canAccessOrganization(currentUser, recordOrganizationId)) {
      throw new ForbiddenException(message);
    }
  }

  buildOrganizationWhere(currentUser: SafeUser): { organizationId: number } {
    return {
      organizationId: this.getRequiredOrganizationId(currentUser),
    };
  }

  buildParkingLotOrganizationWhere(
    currentUser: SafeUser,
  ): Prisma.ParkingLotWhereInput {
    return this.buildOrganizationWhere(currentUser);
  }

  buildFloorOrganizationWhere(currentUser: SafeUser): Prisma.FloorWhereInput {
    return {
      parkingLot: this.buildOrganizationWhere(currentUser),
    };
  }

  buildSlotOrganizationWhere(currentUser: SafeUser): Prisma.SlotWhereInput {
    return {
      floor: {
        parkingLot: this.buildOrganizationWhere(currentUser),
      },
    };
  }

  canAccessUserResource(currentUser: SafeUser, ownerUserId: number) {
    return currentUser.id === ownerUserId;
  }

  canViewUserOwnedRecord(currentUser: SafeUser, ownerUserId: number) {
    return (
      this.isOperationalRole(currentUser) ||
      this.canAccessUserResource(currentUser, ownerUserId)
    );
  }

  assertCanAccessUserResource(
    currentUser: SafeUser,
    ownerUserId: number,
    message: string,
  ) {
    if (!this.canAccessUserResource(currentUser, ownerUserId)) {
      throw new ForbiddenException(message);
    }
  }

  assertOwnerOrAdmin(
    currentUser: SafeUser,
    ownerUserId: number,
    message: string,
  ) {
    if (
      !this.isTenantManager(currentUser) &&
      !this.canAccessUserResource(currentUser, ownerUserId)
    ) {
      throw new ForbiddenException(message);
    }
  }

  assertCanViewUserOwnedRecord(
    currentUser: SafeUser,
    ownerUserId: number,
    message: string,
  ) {
    if (!this.canViewUserOwnedRecord(currentUser, ownerUserId)) {
      throw new ForbiddenException(message);
    }
  }

  buildUserScopedWhere(currentUser: SafeUser): Prisma.ParkingEventWhereInput {
    const organizationWhere = this.buildOrganizationWhere(currentUser);

    return this.isUser(currentUser)
      ? { userId: currentUser.id, ...organizationWhere }
      : organizationWhere;
  }
}