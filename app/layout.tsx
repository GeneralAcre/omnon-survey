import type { Metadata, Viewport } from "next";
import { Noto_Sans_Thai, Open_Sans } from "next/font/google";
import Shell from "@/components/Shell";
import "./globals.css";

const openSans = Open_Sans({
  variable: "--font-open-sans",
  subsets: ["latin"],
});

// Open Sans has no Thai glyphs; Noto Sans Thai is drawn to match it.
const notoThai = Noto_Sans_Thai({
  variable: "--font-noto-thai",
  subsets: ["thai"],
});

// Every page depends on who is signed in on this phone (stored in the browser),
// so the server can't prerender page content to validate instant navigation.
// The pages are client-rendered and navigate instantly anyway.
export const instant = false;

export const metadata: Metadata = {
  title: "Om Non Survey",
  description: "Field survey for the Khlong Om Non Workshop — XAUAT × Chulalongkorn University.",
  appleWebApp: { capable: true, title: "Om Non Survey", statusBarStyle: "black" },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${openSans.variable} ${notoThai.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
