'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function DeleteRuntimeExecutionButton({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  return (
    <button
      type="button"
      disabled={busy}
      className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
      onClick={async () => {
        if (!confirm('¿Eliminar esta ejecución y sus eventos?')) return;
        setBusy(true);
        try {
          const response = await fetch('/api/backend/runtime/executions/' + encodeURIComponent(id), { method: 'DELETE' });
          if (!response.ok) throw new Error(await response.text());
          router.refresh();
        } finally {
          setBusy(false);
        }
      }}
    >
      {busy ? 'Eliminando…' : 'Eliminar'}
    </button>
  );
}
