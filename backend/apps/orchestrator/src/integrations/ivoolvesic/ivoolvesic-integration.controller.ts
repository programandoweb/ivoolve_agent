import { Body, Controller, Get, Headers, HttpCode, Post } from '@nestjs/common';
import { IsObject, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { IvoolveSicIntegrationService } from './ivoolvesic-integration.service';

class SicCampaignRunDto {
  @IsUUID() execution_id!: string;
  @IsUUID() correlation_id!: string;
  @IsUUID() campaign_id!: string;
  @IsString() @MinLength(2) @MaxLength(120) agent_id!: string;
  @IsObject() context!: Record<string, unknown>;
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
