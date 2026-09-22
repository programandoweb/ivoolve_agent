import { Body, Controller, Get, Headers, HttpCode, Post } from '@nestjs/common';
import { IsArray, IsObject, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { IvoolveSicIntegrationService } from './ivoolvesic-integration.service';

class SicCampaignRunDto {
  @IsUUID() execution_id!: string;
  @IsUUID() correlation_id!: string;
  @IsUUID() campaign_id!: string;
  @IsString() @MinLength(2) @MaxLength(120) agent_id!: string;
  @IsObject() context!: Record<string, unknown>;
}

class SicResearchRunDto {
  @IsUUID() researchId!: string;
  @IsUUID() prospectId!: string;
  @IsString() @MinLength(2) @MaxLength(120) agentId!: string;
  @IsObject() prospect!: Record<string, unknown>;
  @IsArray() sources!: Record<string, unknown>[];
  @IsArray() socialProfiles!: Record<string, unknown>[];
}

class SicTestTaskDto {
  @IsString() @MinLength(2) @MaxLength(120) agent_id!: string;
  @IsString() @MinLength(1) @MaxLength(6000) message!: string;
}

@Controller('internal/v1/integrations/ivoolvesic')
export class IvoolveSicIntegrationController {
  constructor(private readonly integration: IvoolveSicIntegrationService) {}

  @Get('ping')
  ping(@Headers('authorization') authorization: string | undefined) {
    this.integration.assertServiceToken(authorization);
    return {
      status: 'ok',
      service: 'ivoolve-agent-orchestrator',
      integration: 'ivoolvesic',
      authenticated: true,
      timestamp: new Date().toISOString(),
    };
  }

  @Post('test-task')
  testTask(
    @Headers('authorization') authorization: string | undefined,
    @Body() dto: SicTestTaskDto,
  ) {
    this.integration.assertServiceToken(authorization);
    return this.integration.testTask(dto.agent_id, dto.message);
  }

  @Post('research-runs')
  @HttpCode(202)
  enqueueResearch(
    @Headers('authorization') authorization: string | undefined,
    @Body() dto: SicResearchRunDto,
  ) {
    this.integration.assertServiceToken(authorization);
    return this.integration.enqueueResearch(dto);
  }

  @Post('campaign-runs')
  @HttpCode(202)
  enqueue(
    @Headers('authorization') authorization: string | undefined,
    @Body() dto: SicCampaignRunDto,
  ) {
    this.integration.assertServiceToken(authorization);
    return this.integration.enqueue(dto);
  }
}
