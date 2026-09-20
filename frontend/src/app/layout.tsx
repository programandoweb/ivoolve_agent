import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ivoolve Agent",
  description: "Interfaz para aprender, observar e interactuar con agentes de IA."
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
