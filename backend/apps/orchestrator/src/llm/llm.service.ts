import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { LlmMessage } from './llm.types';

interface CompatibleResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

@Injectable()
export class LlmService {
  constructor(private readonly config: ConfigService) {}

  async complete(messages: LlmMessage[]): Promise<string> {
    // La URL no está amarrada a LM Studio: cualquier API compatible puede reemplazarla.
    const baseUrl = this.config
      .get<string>('LLM_BASE_URL', 'http://localhost:1234/v1')
      .replace(/\/$/, '');

    const model = this.config.get<string>('LLM_MODEL', 'local-model');
    const apiKey = this.config.get<string>('LLM_API_KEY', 'lm-studio');
    const temperature = Number(this.config.get<string>('LLM_TEMPERATURE', '0.2'));
    const timeoutMs = Number(this.config.get<string>('LLM_TIMEOUT_MS', '60000'));

    // AbortController evita que una petición al proveedor quede bloqueada indefinidamente.
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      // Esta es la llamada HTTP real al cerebro LLM.
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          temperature,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(
          `LLM respondió HTTP ${response.status}: ${await response.text()}`,
        );
      }

      const data = (await response.json()) as CompatibleResponse;
      const content = data.choices?.[0]?.message?.content?.trim();

      if (!content) {
        throw new Error('El LLM respondió sin contenido.');
      }

      return content;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido';

      throw new ServiceUnavailableException(
        `No fue posible contactar el LLM. Revisa LM Studio y .env. Detalle: ${message}`,
      );
    } finally {
      clearTimeout(timeout);
    }
  }
}
