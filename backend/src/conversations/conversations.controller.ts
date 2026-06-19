import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { SafeUser } from '../users/types/safe-user.type';
import { ConversationsService } from './conversations.service';
import { ListConversationsQueryDto } from './dto/list-conversations-query.dto';
import { SendConversationMessageDto } from './dto/send-conversation-message.dto';
import { StartCustomerCareConversationDto } from './dto/start-customer-care-conversation.dto';
import { StartSecurityConversationDto } from './dto/start-security-conversation.dto';

@Controller('conversations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Post('security')
  @Roles(Role.USER)
  startSecurityConversation(
    @CurrentUser() currentUser: SafeUser,
    @Body() dto: StartSecurityConversationDto,
  ) {
    return this.conversationsService.startSecurityConversation(currentUser, dto);
  }

  @Post('customer-care')
  @Roles(Role.USER)
  startCustomerCareConversation(
    @CurrentUser() currentUser: SafeUser,
    @Body() dto: StartCustomerCareConversationDto,
  ) {
    return this.conversationsService.startCustomerCareConversation(currentUser, dto);
  }

  @Get()
  @Roles(Role.USER, Role.SECURITY, Role.ADMIN, Role.TENANT_ADMIN)
  listConversations(
    @CurrentUser() currentUser: SafeUser,
    @Query() query: ListConversationsQueryDto,
  ) {
    return this.conversationsService.listConversations(currentUser, query);
  }

  @Get(':id/messages')
  @Roles(Role.USER, Role.SECURITY, Role.ADMIN, Role.TENANT_ADMIN)
  getMessages(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: SafeUser,
  ) {
    return this.conversationsService.getMessages(currentUser, id);
  }

  @Post(':id/messages')
  @Roles(Role.USER, Role.SECURITY, Role.ADMIN, Role.TENANT_ADMIN)
  sendMessage(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: SafeUser,
    @Body() dto: SendConversationMessageDto,
  ) {
    return this.conversationsService.sendMessage(currentUser, id, dto.body);
  }

  @Patch(':id/resolve')
  @Roles(Role.SECURITY, Role.ADMIN, Role.TENANT_ADMIN)
  resolveConversation(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: SafeUser,
  ) {
    return this.conversationsService.resolveConversation(currentUser, id);
  }
}