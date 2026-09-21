import {
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateProviderDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name!: string;

  @IsIn(['whatsapp_baileys'])
  type!: 'whatsapp_baileys';

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  agentIds?: string[];

  @IsOptional()
  @IsBoolean()
  autoConnect?: boolean;
}
