import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Ivoolve Agent — Multi-Agent AI Control Center",
    short_name: "Ivoolve Agent",
    description:
      "Control center para crear, orquestar y observar agentes de inteligencia artificial.",
    start_url: "/",
    display: "standalone",
    background_color: "#09090b",
    theme_color: "#7c3aed",
    lang: "es-CO",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any"
      }
    ]
  };
}
