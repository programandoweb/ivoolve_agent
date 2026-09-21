import type { Metadata, Viewport } from "next";
import "./globals.css";

const appUrl =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
  "http://localhost:5021";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "Ivoolve Agent — Multi-Agent AI Control Center",
    template: "%s · Ivoolve Agent"
  },
  description:
    "Control center para crear, orquestar, observar y evolucionar agentes de inteligencia artificial.",
  applicationName: "Ivoolve Agent",
  authors: [{ name: "Programandoweb" }],
  creator: "Programandoweb",
  publisher: "Programandoweb",
  category: "technology",
  keywords: [
    "Ivoolve Agent",
    "agentes de IA",
    "multiagente",
    "AI agents",
    "NestJS",
    "Next.js",
    "Redis",
    "orquestación de agentes"
  ],
  alternates: {
    canonical: "/"
  },
  openGraph: {
    type: "website",
    locale: "es_CO",
    url: "/",
    siteName: "Ivoolve Agent",
    title: "Ivoolve Agent — Multi-Agent AI Control Center",
    description:
      "Crea, orquesta y observa agentes de IA desde un control center diseñado para construir sistemas multiagente."
  },
  twitter: {
    card: "summary_large_image",
    title: "Ivoolve Agent — Multi-Agent AI Control Center",
    description:
      "Crea, orquesta y observa agentes de IA desde un control center diseñado para construir sistemas multiagente."
  },
  robots: {
    index: false,
    follow: false,
    nocache: true
  },
  manifest: "/manifest.webmanifest"
};

export const viewport: Viewport = {
  themeColor: "#7c3aed",
  colorScheme: "light"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
