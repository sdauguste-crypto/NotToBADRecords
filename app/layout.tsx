import type { Metadata, Viewport } from "next";
import "@fontsource/cinzel-decorative/400.css";
import "@fontsource/cinzel-decorative/700.css";
import "@fontsource/cinzel-decorative/900.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "NotToBAD Records — Mission Control",
  description:
    "Independent record label broadcasting from the edge of the sunset. Music, videos, shows, and transmissions from mission control.",
  icons: {
    icon: "/favicon.svg",
  },
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
