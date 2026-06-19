import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ConversationStatus,
  ConversationType,
  Prisma,
  Role,
} from '@prisma/client';
import { AccessPolicyService } from '../common/access-policy.service';
import { PrismaService } from '../prisma/prisma.service';
import { SafeUser } from '../users/types/safe-user.type';
import {
  conversationListInclude,
  conversationMessageInclude,
  presentConversationList,
  presentConversationListItem,
  presentConversationMessage,
} from './conversation.presenter';
import { normalizeConversationMessage } from './conversation.util';
import { StartCustomerCareConversationDto } from './dto/start-customer-care-conversation.dto';
import { StartSecurityConversationDto } from './dto/start-security-conversation.dto';
import { ListConversationsQueryDto } from './dto/list-conversations-query.dto';

@Injectable()
export class ConversationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessPolicy: AccessPolicyService,
  ) {}

  async startSecurityConversation(
    currentUser: SafeUser,
    dto: StartSecurityConversationDto,
  ) {
    this.assertUserRole(currentUser);

    const organizationId = this.accessPolicy.getRequiredOrganizationId(currentUser);
    const message = normalizeConversationMessage(dto.message);

    if (!dto.parkingLotId && !dto.bookingId) {
      throw new BadRequestException('parkingLotId or bookingId is required');
    }

    const { parkingLotId, bookingId } = await this.resolveSecurityContext(
      currentUser,
      organizationId,
      dto.parkingLotId,
      dto.bookingId,
    );

    return this.createConversationWithMessage({
      currentUser,
      organizationId,
      type: ConversationType.SECURITY,
      message,
      parkingLotId,
      bookingId,
    });
  }

  async startCustomerCareConversation(
    currentUser: SafeUser,
    dto: StartCustomerCareConversationDto,
  ) {
    this.assertUserRole(currentUser);

    const organizationId = this.accessPolicy.getRequiredOrganizationId(currentUser);
    const message = normalizeConversationMessage(dto.message);
    const bookingId = dto.bookingId
      ? await this.resolveOptionalBookingId(currentUser, organizationId, dto.bookingId)
      : undefined;

    return this.createConversationWithMessage({
      currentUser,
      organizationId,
      type: ConversationType.CUSTOMER_CARE,
      message,
      subject: dto.subject?.trim() || undefined,
      bookingId,
    });
  }

  async listConversations(currentUser: SafeUser, query: ListConversationsQueryDto) {
    this.assertCanUseConversations(currentUser);

    const organizationId = this.accessPolicy.getRequiredOrganizationId(currentUser);
    const where = this.buildListWhere(currentUser, organizationId, query);

    const conversations = await this.prisma.conversation.findMany({
      where,
      orderBy: [{ lastMessageAt: 'desc' }, { id: 'desc' }],
      include: conversationListInclude,
    });

    return presentConversationList(conversations);
  }

  async getMessages(currentUser: SafeUser, conversationId: number) {
    const conversation = await this.findVisibleConversationOrThrow(
      currentUser,
      conversationId,
    );

    const messages = await this.prisma.conversationMessage.findMany({
      where: {
        conversationId: conversation.id,
        organizationId: conversation.organizationId,
      },
      orderBy: { createdAt: 'asc' },
      include: conversationMessageInclude,
    });

    return messages.map((message) => presentConversationMessage(message, currentUser));
  }

  async sendMessage(
    currentUser: SafeUser,
    conversationId: number,
    body: string,
  ) {
    const conversation = await this.findVisibleConversationOrThrow(
      currentUser,
      conversationId,
    );

    this.assertCanSendMessage(currentUser, conversation);
    this.assertConversationOpen(conversation);

    const message = normalizeConversationMessage(body);
    const now = new Date();

    const createdMessage = await this.prisma.$transaction(async (tx) => {
      const created = await tx.conversationMessage.create({
        data: {
          organizationId: conversation.organizationId,
          conversationId: conversation.id,
          senderId: currentUser.id,
          body: message,
        },
        include: conversationMessageInclude,
      });

      await tx.conversation.update({
        where: { id: conversation.id },
        data: { lastMessageAt: now },
      });

      return created;
    });

    return presentConversationMessage(createdMessage, currentUser);
  }

  async resolveConversation(currentUser: SafeUser, conversationId: number) {
    const conversation = await this.findVisibleConversationOrThrow(
      currentUser,
      conversationId,
    );

    this.assertCanResolveConversation(currentUser, conversation);

    const updated = await this.prisma.conversation.update({
      where: { id: conversation.id },
      data: { status: ConversationStatus.RESOLVED },
      include: conversationListInclude,
    });

    return presentConversationListItem(updated);
  }

  private assertCanUseConversations(currentUser: SafeUser) {
    if (currentUser.role === Role.SUPER_ADMIN) {
      throw new ForbiddenException('Super admin cannot access tenant conversations');
    }
  }

  private assertUserRole(currentUser: SafeUser) {
    this.assertCanUseConversations(currentUser);

    if (!this.accessPolicy.isUser(currentUser)) {
      throw new ForbiddenException('Only users can start support conversations');
    }
  }

  private isTenantAdminRole(currentUser: SafeUser) {
    return (
      currentUser.role === Role.ADMIN || currentUser.role === Role.TENANT_ADMIN
    );
  }

  private buildListWhere(
    currentUser: SafeUser,
    organizationId: number,
    query: ListConversationsQueryDto,
  ): Prisma.ConversationWhereInput {
    const where: Prisma.ConversationWhereInput = {
      organizationId,
    };

    if (query.type) {
      where.type = query.type;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (this.accessPolicy.isUser(currentUser)) {
      where.createdByUserId = currentUser.id;
      return where;
    }

    if (this.accessPolicy.isSecurity(currentUser)) {
      where.type = ConversationType.SECURITY;
      return where;
    }

    if (this.isTenantAdminRole(currentUser)) {
      return where;
    }

    throw new ForbiddenException('Access denied');
  }

  private async findVisibleConversationOrThrow(
    currentUser: SafeUser,
    conversationId: number,
  ) {
    this.assertCanUseConversations(currentUser);

    const organizationId = this.accessPolicy.getRequiredOrganizationId(currentUser);
    const conversation = await this.prisma.conversation.findFirst({
      where: {
        id: conversationId,
        organizationId,
      },
      include: conversationListInclude,
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    if (!this.canViewConversation(currentUser, conversation)) {
      throw new ForbiddenException('Access denied');
    }

    return conversation;
  }

  private canViewConversation(
    currentUser: SafeUser,
    conversation: {
      createdByUserId: number;
      type: ConversationType;
      organizationId: number;
    },
  ) {
    if (!this.accessPolicy.canAccessOrganization(currentUser, conversation.organizationId)) {
      return false;
    }

    if (this.accessPolicy.isUser(currentUser)) {
      return conversation.createdByUserId === currentUser.id;
    }

    if (this.accessPolicy.isSecurity(currentUser)) {
      return conversation.type === ConversationType.SECURITY;
    }

    if (this.isTenantAdminRole(currentUser)) {
      return true;
    }

    return false;
  }

  private assertCanSendMessage(
    currentUser: SafeUser,
    conversation: {
      createdByUserId: number;
      type: ConversationType;
    },
  ) {
    if (this.accessPolicy.isUser(currentUser)) {
      if (conversation.createdByUserId !== currentUser.id) {
        throw new ForbiddenException('You can only message your own conversations');
      }
      return;
    }

    if (this.accessPolicy.isSecurity(currentUser)) {
      if (conversation.type !== ConversationType.SECURITY) {
        throw new ForbiddenException('Security staff can only reply to security conversations');
      }
      return;
    }

    if (this.isTenantAdminRole(currentUser)) {
      return;
    }

    throw new ForbiddenException('Access denied');
  }

  private assertCanResolveConversation(
    currentUser: SafeUser,
    conversation: { type: ConversationType },
  ) {
    if (this.accessPolicy.isUser(currentUser)) {
      throw new ForbiddenException('Users cannot resolve conversations');
    }

    if (this.accessPolicy.isSecurity(currentUser)) {
      if (conversation.type !== ConversationType.SECURITY) {
        throw new ForbiddenException('Security staff can only resolve security conversations');
      }
      return;
    }

    if (this.isTenantAdminRole(currentUser)) {
      return;
    }

    throw new ForbiddenException('Access denied');
  }

  private assertConversationOpen(conversation: { status: ConversationStatus }) {
    if (conversation.status === ConversationStatus.RESOLVED) {
      throw new BadRequestException('Conversation is resolved');
    }
  }

  private async resolveSecurityContext(
    currentUser: SafeUser,
    organizationId: number,
    parkingLotId?: number,
    bookingId?: number,
  ) {
    if (bookingId) {
      const booking = await this.prisma.booking.findFirst({
        where: {
          id: bookingId,
          userId: currentUser.id,
          organizationId,
        },
        select: {
          id: true,
          parkingLotId: true,
        },
      });

      if (!booking) {
        throw new NotFoundException('Booking not found');
      }

      if (parkingLotId && parkingLotId !== booking.parkingLotId) {
        throw new BadRequestException('Booking does not belong to the selected parking lot');
      }

      return {
        bookingId: booking.id,
        parkingLotId: parkingLotId ?? booking.parkingLotId,
      };
    }

    const lot = await this.prisma.parkingLot.findFirst({
      where: {
        id: parkingLotId,
        organizationId,
        isActive: true,
      },
      select: { id: true },
    });

    if (!lot) {
      throw new NotFoundException('Parking lot not found');
    }

    return {
      bookingId: undefined,
      parkingLotId: lot.id,
    };
  }

  private async resolveOptionalBookingId(
    currentUser: SafeUser,
    organizationId: number,
    bookingId: number,
  ) {
    const booking = await this.prisma.booking.findFirst({
      where: {
        id: bookingId,
        userId: currentUser.id,
        organizationId,
      },
      select: { id: true },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    return booking.id;
  }

  private async createConversationWithMessage({
    currentUser,
    organizationId,
    type,
    message,
    subject,
    parkingLotId,
    bookingId,
  }: {
    currentUser: SafeUser;
    organizationId: number;
    type: ConversationType;
    message: string;
    subject?: string;
    parkingLotId?: number;
    bookingId?: number;
  }) {
    const now = new Date();

    const conversation = await this.prisma.$transaction(async (tx) => {
      const createdConversation = await tx.conversation.create({
        data: {
          organizationId,
          type,
          status: ConversationStatus.OPEN,
          subject,
          createdByUserId: currentUser.id,
          parkingLotId,
          bookingId,
          lastMessageAt: now,
        },
        include: conversationListInclude,
      });

      await tx.conversationMessage.create({
        data: {
          organizationId,
          conversationId: createdConversation.id,
          senderId: currentUser.id,
          body: message,
        },
      });

      const refreshed = await tx.conversation.findUniqueOrThrow({
        where: { id: createdConversation.id },
        include: conversationListInclude,
      });

      return refreshed;
    });

    return presentConversationListItem(conversation);
  }
}