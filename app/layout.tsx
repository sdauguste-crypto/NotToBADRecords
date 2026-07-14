import type { Metadata, Viewport } from "next";
import "@fontsource/cinzel-decorative/400.css";
import "@fontsource/cinzel-decorative/700.css";
import "@fontsource/cinzel-decorative/900.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Not To B.A.D Records — Mission Control",
  description:
    "Simon Auguste — Not To B.A.D Records. We Really Out Here. Music, videos, shows, and transmissions from mission control.",
};

export const viewport: Viewport = {
  themeColor: "#0a0612",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
