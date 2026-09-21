export type ProviderType = 'whatsapp_baileys';

export type ProviderStatus =
  | 'disconnected'
  | 'connecting'
  | 'qr_pending'
  | 'connected'
  | 'error';

export interface ProviderRecord {
  id: string;
  name: string;
  type: ProviderType;
  status: ProviderStatus;
  agentIds: string[];
  autoConnect: boolean;
  phoneNumber?: string;
  displayName?: string;
  lastConnectedAt?: string;
  lastMessageAt?: string;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProviderConnectionView extends ProviderRecord {
  // El QR es efímero: solo vive en memoria mientras Baileys espera el escaneo.
  qr?: string;
  qrDataUrl?: string;
}
