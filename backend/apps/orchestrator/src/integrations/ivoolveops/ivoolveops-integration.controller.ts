import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

import { IvoolveOpsIntegrationService } from './ivoolveops-integration.service';

class CustomerDto {
  @IsString() @MinLength(1) @MaxLength(160) name!: string;
  @IsOptional() @IsString() @MaxLength(160) contact_name?: string;
  @IsOptional() @IsEmail() @MaxLength(190) email?: string;
  @IsOptional() @IsString() @MaxLength(60) whatsapp?: string;
}

class ProjectDto {
  @IsString() @MinLength(1) @MaxLength(160) name!: string;
  @IsOptional() @IsString() @MaxLength(255) domain?: string;
}

class AgentDto {
  @IsOptional() @IsString() @MaxLength(160) name?: string;
  @IsOptional() @IsIn(['customer_support']) role?: 'customer_support';
}

class ProvisionAgentDto {
  @IsString() @MinLength(1) @MaxLength(190) external_customer_id!: string;
  @IsString() @MinLength(1) @MaxLength(190) external_project_id!: string;
  @ValidateNested() @Type(() => CustomerDto) customer!: CustomerDto;
  @ValidateNested() @Type(() => ProjectDto) project!: ProjectDto;
  @IsOptional() @ValidateNested() @Type(() => AgentDto) agent?: AgentDto;
}

class CreateSsoTicketDto {
  @IsString() @MinLength(1) @MaxLength(120) agent_id!: string;
  @IsString() @MinLength(1) @MaxLength(190) external_project_id!: string;
  @IsString() @MinLength(1) @MaxLength(190) external_user_id!: string;
}

@Controller('internal/v1/integrations/ivoolveops')
export class IvoolveOpsIntegrationController {
  constructor(private readonly integration: IvoolveOpsIntegrationService) {}

  @Post('agents')
  provision(
    @Headers('authorization') authorization: string | undefined,
    @Headers('idempotency-key') idempotencyKey: string,
    @Headers('x-correlation-id') correlationId: string | undefined,
    @Body() dto: ProvisionAgentDto,
  ) {
    this.integration.assertServiceToken(authorization);
    return this.integration.provision(dto, idempotencyKey, correlationId);
  }

  @Get('agents/:externalProjectId/customer-support')
  status(
    @Headers('authorization') authorization: string | undefined,
    @Param('externalProjectId') externalProjectId: string,
  ) {
    this.integration.assertServiceToken(authorization);
    return this.integration.status(externalProjectId);
  }

  @Post('sso-tickets')
  createSsoTicket(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-correlation-id') correlationId: string | undefined,
    @Body() dto: CreateSsoTicketDto,
  ) {
    this.integration.assertServiceToken(authorization);
    return this.integration.createSsoTicket(
      dto.agent_id,
      dto.external_project_id,
      dto.external_user_id,
      correlationId,
    );
  }
}

@Controller('integrations/ivoolveops/sso')
export class IvoolveOpsSsoController {
  constructor(private readonly integration: IvoolveOpsIntegrationService) {}

  @Get('consume')
  consume(@Query('ticket') ticket: string) {
    return this.integration.consumeSsoTicket(ticket);
  }
}
