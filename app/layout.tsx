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
      icon: [{ url: "/favicon-rings-staggered.png", type: "image/png", sizes: "1536x1536" }],
      shortcut: "/favicon-rings-staggered.png",
      apple: "/favicon-rings-staggered.png",
    },
    openGraph: {
      title,
      description,
      type: "website",
      images: [{ url: "/og-whatsapp.png", width: 2048, height: 1152, alt: "María y Guido — 21 de noviembre de 2026" }],
    },
    twitter: { card: "summary_large_image", title, description, images: ["/og-whatsapp.png"] },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
