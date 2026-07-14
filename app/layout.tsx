import type { Metadata, Viewport } from "next";
import "@fontsource/cinzel-decorative/400.css";
import "@fontsource/cinzel-decorative/700.css";
import "@fontsource/cinzel-decorative/900.css";
import "./globals.css";

const SITE_TITLE = "Not To B.A.D Records — Mission Control";
const SITE_DESCRIPTION =
  "Simon Auguste — Not To B.A.D Records. We Really Out Here. Music, videos, shows, and transmissions from mission control.";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.nottobadrecords.com"),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: "https://www.nottobadrecords.com",
    siteName: "Not To B.A.D Records",
    type: "website",
    images: [{ url: "/og-card.jpg", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: ["/og-card.jpg"],
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
      <body>
        {children}
        {/* GoatCounter analytics — privacy-friendly, no cookies. Counts
            activate once the "nottobadrecords" code is registered at
            goatcounter.com; until then the script no-ops harmlessly. */}
        <script
          async
          data-goatcounter="https://nottobadrecords.goatcounter.com/count"
          src="https://gc.zgo.at/count.js"
        />
      </body>
    </html>
  );
}
