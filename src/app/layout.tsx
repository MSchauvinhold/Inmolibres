import type { Metadata, Viewport } from "next";
import { Playfair_Display, DM_Sans, JetBrains_Mono, Fraunces, Plus_Jakarta_Sans } from "next/font/google";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { Toaster } from "sonner";
import "./globals.css";

const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-playfair-display",
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-dm-sans",
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jetbrains-mono",
  weight: ["400", "500", "600"],
});

const fraunces = Fraunces({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-fraunces-display",
  weight: ["300", "400", "600", "700", "900"],
  style: ["normal", "italic"],
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-plus-jakarta",
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "InmoLibres — Inmobiliaria en Paso de los Libres",
    template: "%s | InmoLibres",
  },
  description:
    "CRM y marketplace inmobiliario para Paso de los Libres, Corrientes. Encontrá tu próxima propiedad.",
  keywords: [
    "inmobiliaria",
    "paso de los libres",
    "corrientes",
    "propiedades",
    "alquiler",
    "venta",
    "terrenos",
  ],
  authors: [{ name: "InmoLibres" }],
  creator: "InmoLibres",
  metadataBase: new URL(
    process.env.NEXTAUTH_URL ?? "http://localhost:3000"
  ),
  openGraph: {
    type: "website",
    locale: "es_AR",
    siteName: "InmoLibres",
    title: "InmoLibres — Inmobiliaria en Paso de los Libres",
    description:
      "CRM y marketplace inmobiliario para Paso de los Libres, Corrientes.",
  },
  twitter: {
    card: "summary_large_image",
    title: "InmoLibres",
    description: "Inmobiliaria en Paso de los Libres, Corrientes.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F7F5F2" },
    { media: "(prefers-color-scheme: dark)", color: "#1C1917" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      suppressHydrationWarning
      data-scroll-behavior="smooth"
      className={`${playfairDisplay.variable} ${dmSans.variable} ${jetbrainsMono.variable} ${fraunces.variable} ${plusJakartaSans.variable}`}
    >
      <body className="min-h-screen antialiased">
        <ThemeProvider defaultTheme="light">
          {children}
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
