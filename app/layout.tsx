import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3003";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const metadataBase = new URL(`${protocol}://${host}`);
  const title = "María & Guido — 21.11.2026";
  const description = "Toda la información, confirmación de asistencia y lista de regalos de nuestro casamiento.";

  return {
    metadataBase,
    title,
    description,
    icons: {
      icon: [{ url: "/favicon-rings-ai.png", type: "image/png", sizes: "512x512" }],
      shortcut: "/favicon-rings-ai.png",
      apple: "/favicon-rings-ai.png",
    },
    openGraph: {
      title,
      description,
      type: "website",
      images: [{ url: "/og.png", width: 1739, height: 909, alt: "María y Guido — 21 de noviembre de 2026" }],
    },
    twitter: { card: "summary_large_image", title, description, images: ["/og.png"] },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
