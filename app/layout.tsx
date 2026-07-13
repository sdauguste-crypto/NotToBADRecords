import type { Metadata } from "next";
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
