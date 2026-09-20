import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class ChatDto {
  // Identificador que permite recuperar la conversación desde Redis.
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  sessionId!: string;

  // Texto nuevo enviado por el usuario.
  @IsString()
  @IsNotEmpty()
  @MaxLength(20000)
  message!: string;
}
