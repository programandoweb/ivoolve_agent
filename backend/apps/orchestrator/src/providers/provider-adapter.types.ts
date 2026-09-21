export interface ProviderAdapterCapabilities {
  inbound: boolean;
  outbound: boolean;
  pairing: 'qr' | 'credentials' | 'oauth' | 'none';
  supportsAttachments: boolean;
  supportsMultiInstanceLease: boolean;
}

export interface ProviderAdapterDescriptor {
  type: string;
  name: string;
  status: 'active' | 'planned';
  capabilities: ProviderAdapterCapabilities;
}
