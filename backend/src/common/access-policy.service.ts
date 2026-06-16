import { ForbiddenException, Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';
import { SafeUser } from '../users/types/safe-user.type';

@Injectable()
export class AccessPolicyService {
  isAdmin(user: SafeUser) {
    return user.role === Role.ADMIN;
  }

  isSecurity(user: SafeUser) {
    return user.role === Role.SECURITY;
  }

  isUser(user: SafeUser) {
    return user.role === Role.USER;
  }

  isOperationalRole(user: SafeUser) {
    return this.isAdmin(user) || this.isSecurity(user);
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
    if (!this.isAdmin(currentUser) && !this.canAccessUserResource(currentUser, ownerUserId)) {
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

  buildUserScopedWhere(currentUser: SafeUser) {
    return this.isUser(currentUser) ? { userId: currentUser.id } : {};
  }
}