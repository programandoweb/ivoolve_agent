import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateProviderDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  agentIds?: string[];

  @IsOptional()
  @IsBoolean()
  autoConnect?: boolean;
}
