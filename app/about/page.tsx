import type { Metadata } from "next";
import About from "@/components/About";

export const metadata: Metadata = { title: "About · Om Non Survey" };

// Content waits for the signed-in user (see Shell), so there is nothing to validate on the server.
export const instant = false;

export default function AboutPage() {
  return <About />;
}
