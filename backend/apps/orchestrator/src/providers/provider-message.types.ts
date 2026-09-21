export interface NormalizedProviderMessage {
  providerId: string;
  providerType: 'whatsapp_baileys';
  messageId: string;
  sender: string;
  conversationId: string;
  text: string;
  receivedAt: string;
}

export type ProviderMessageHandler = (
  message: NormalizedProviderMessage,
) => Promise<void>;
