import type { Metadata, Viewport } from "next";
import { Kanit, Open_Sans } from "next/font/google";
import Shell from "@/components/Shell";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import "./globals.css";

const openSans = Open_Sans({
  variable: "--font-open-sans",
  subsets: ["latin"],
});

// Open Sans has no Thai glyphs, so Thai text falls through to Kanit.
const kanit = Kanit({
  variable: "--font-kanit",
  subsets: ["thai"],
  weight: ["400", "500", "600", "700"],
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
    <html lang="en" className={cn("dark h-full antialiased", openSans.variable, kanit.variable)}>
      <body className="flex min-h-full flex-col">
        <Shell>{children}</Shell>
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
