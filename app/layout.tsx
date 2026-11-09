import type { Metadata, Viewport } from "next";
import { Inter, Kanit, Space_Grotesk } from "next/font/google";
import { preconnect } from "react-dom";
import Shell from "@/components/Shell";
import { Toaster } from "@/components/ui/sonner";
import { r2Origin } from "@/lib/r2";
import { cn } from "@/lib/utils";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

// Headlines (see font-display in globals.css).
const grotesk = Space_Grotesk({
  variable: "--font-grotesk",
  subsets: ["latin"],
  weight: "500",
});

// Inter and Space Grotesk have no Thai glyphs, so Thai text falls through to Kanit.
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
  description: "Field survey for the Khlong Om Non Workshop by XAUAT and Chulalongkorn University.",
  appleWebApp: { capable: true, title: "Om Non Survey", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#faf6f0",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  // Photos load from R2 (via a redirect); start that connection along with the page.
  const r2 = r2Origin();
  if (r2) preconnect(r2);
  return (
    <html lang="th" className={cn("h-full antialiased", inter.variable, grotesk.variable, kanit.variable)}>
      <body className="flex min-h-full flex-col">
        <Shell>{children}</Shell>
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
