import type { Metadata } from "next";
import "@fontsource/cinzel-decorative/400.css";
import "@fontsource/cinzel-decorative/700.css";
import "@fontsource/cinzel-decorative/900.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "NotToBAD Records",
  description: "Build 10x Faster with NS",
  icons: {
    icon: "/favicon.svg",
  },
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
