import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  ConversationStatus,
  ConversationType,
} from '@prisma/client';
import { AccessPolicyService } from '../common/access-policy.service';
import { org1 } from '../test/test-tenant-fixtures';
import {
  adminUser,
  normalUser,
  normalUserOrg2,
  securityUser,
  tenantAdminUser,
} from '../test/test-users';
import { ConversationsService } from './conversations.service';

function buildConversationRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    organizationId: org1.organizationId,
    type: ConversationType.SECURITY,
    status: ConversationStatus.OPEN,
    subject: null,
    createdByUserId: org1.normalUser.id,
    assignedToUserId: null,
    parkingLotId: org1.parkingLot.id,
    bookingId: null,
    lastMessageAt: new Date('2026-06-19T10:00:00.000Z'),
    createdAt: new Date('2026-06-19T10:00:00.000Z'),
    updatedAt: new Date('2026-06-19T10:00:00.000Z'),
    createdByUser: {
      name: org1.normalUser.name,
      email: org1.normalUser.email,
    },
    assignedToUser: null,
    parkingLot: {
      id: org1.parkingLot.id,
      name: org1.parkingLot.name,
    },
    booking: null,
    messages: [{ body: 'Hello security' }],
    ...overrides,
  };
}

describe('ConversationsService', () => {
  let service: ConversationsService;
  let prisma: {
    booking: { findFirst: jest.Mock };
    conversation: {
      create: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      findUniqueOrThrow: jest.Mock;
      update: jest.Mock;
    };
    conversationMessage: {
      create: jest.Mock;
      findMany: jest.Mock;
    };
    parkingLot: { findFirst: jest.Mock };
    $transaction: jest.Mock;
  };

  beforeEach(() => {
    prisma = {
      booking: { findFirst: jest.fn() },
      conversation: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        update: jest.fn(),
      },
      conversationMessage: {
        create: jest.fn(),
        findMany: jest.fn(),
      },
      parkingLot: { findFirst: jest.fn() },
      $transaction: jest.fn(async (callback: (tx: typeof prisma) => unknown) =>
        callback(prisma),
      ),
    };

    service = new ConversationsService(prisma as never, new AccessPolicyService());
  });

  it('allows USER to create a security conversation in own org', async () => {
    prisma.parkingLot.findFirst.mockResolvedValue({ id: org1.parkingLot.id });
    prisma.conversation.create.mockResolvedValue(buildConversationRecord());
    prisma.conversation.findUniqueOrThrow.mockResolvedValue(buildConversationRecord());

    const result = await service.startSecurityConversation(normalUser, {
      parkingLotId: org1.parkingLot.id,
      message: 'I am arriving in 10 minutes',
    });

    expect(result.type).toBe(ConversationType.SECURITY);
    expect(result.createdBy.email).toBe(normalUser.email);
    expect(prisma.conversation.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: org1.organizationId,
          type: ConversationType.SECURITY,
          createdByUserId: normalUser.id,
          parkingLotId: org1.parkingLot.id,
        }),
      }),
    );
  });

  it('blocks USER from reading another user conversation', async () => {
    prisma.conversation.findFirst.mockResolvedValue(
      buildConversationRecord({
        createdByUserId: normalUserOrg2.id,
        organizationId: org1.organizationId,
      }),
    );

    await expect(service.getMessages(normalUser, 1)).rejects.toThrow(ForbiddenException);
  });

  it('allows SECURITY to read security conversation in own org', async () => {
    prisma.conversation.findFirst.mockResolvedValue(buildConversationRecord());
    prisma.conversationMessage.findMany.mockResolvedValue([
      {
        id: 10,
        organizationId: org1.organizationId,
        conversationId: 1,
        senderId: normalUser.id,
        body: 'Need help at the gate',
        createdAt: new Date('2026-06-19T10:00:00.000Z'),
        sender: {
          name: normalUser.name,
          role: normalUser.role,
        },
      },
    ]);

    const messages = await service.getMessages(securityUser, 1);

    expect(messages).toHaveLength(1);
    expect(messages[0].body).toBe('Need help at the gate');
  });

  it('blocks SECURITY from reading cross-tenant conversation', async () => {
    prisma.conversation.findFirst.mockResolvedValue(null);

    await expect(service.getMessages(securityUser, 99)).rejects.toThrow(NotFoundException);
  });

  it('allows TENANT_ADMIN to read tenant customer-care conversation', async () => {
    prisma.conversation.findFirst.mockResolvedValue(
      buildConversationRecord({
        type: ConversationType.CUSTOMER_CARE,
        subject: 'Payment issue',
      }),
    );
    prisma.conversationMessage.findMany.mockResolvedValue([]);

    const messages = await service.getMessages(tenantAdminUser, 1);

    expect(messages).toEqual([]);
  });

  it('rejects empty message', async () => {
    await expect(
      service.startSecurityConversation(normalUser, {
        parkingLotId: org1.parkingLot.id,
        message: '   ',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('blocks sending messages to resolved conversations', async () => {
    prisma.conversation.findFirst.mockResolvedValue(
      buildConversationRecord({
        status: ConversationStatus.RESOLVED,
      }),
    );

    await expect(
      service.sendMessage(normalUser, 1, 'Any update?'),
    ).rejects.toThrow(BadRequestException);
  });

  it('allows ADMIN to list customer-care conversations in tenant', async () => {
    prisma.conversation.findMany.mockResolvedValue([
      buildConversationRecord({
        type: ConversationType.CUSTOMER_CARE,
        subject: 'Need refund help',
      }),
    ]);

    const conversations = await service.listConversations(adminUser, {
      type: ConversationType.CUSTOMER_CARE,
    });

    expect(conversations).toHaveLength(1);
    expect(conversations[0].type).toBe(ConversationType.CUSTOMER_CARE);
    expect(prisma.conversation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: org1.organizationId,
          type: ConversationType.CUSTOMER_CARE,
        }),
      }),
    );
  });
});