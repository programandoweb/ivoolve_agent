"use client";

import { Download } from "lucide-react";

export function DownloadJsonButton({
  data,
  filename,
  label = "Descargar JSON",
}: {
  data: unknown;
  filename: string;
  label?: string;
}) {
  const download = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename.endsWith(".json") ? filename : filename + ".json";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <button
      type="button"
      onClick={download}
      className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-bold text-zinc-700 transition hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700"
    >
      <Download className="h-4 w-4" />
      {label}
    </button>
  );
}
