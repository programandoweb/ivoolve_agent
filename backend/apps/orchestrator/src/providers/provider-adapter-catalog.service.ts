import { Injectable } from '@nestjs/common';

import { ProviderAdapterDescriptor } from './provider-adapter.types';

@Injectable()
export class ProviderAdapterCatalogService {
  list(): ProviderAdapterDescriptor[] {
    return [
      {
        type: 'whatsapp_baileys',
        name: 'WhatsApp · Baileys',
        status: 'active',
        capabilities: {
          inbound: true,
          outbound: true,
          pairing: 'qr',
          supportsAttachments: false,
          supportsMultiInstanceLease: true,
        },
      },
    ];
  }

  get(type: string): ProviderAdapterDescriptor | undefined {
    return this.list().find((adapter) => adapter.type === type);
  }

  isActive(type: string): boolean {
    return this.get(type)?.status === 'active';
  }
}
