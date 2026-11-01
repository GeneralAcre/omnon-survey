import type { Metadata } from "next";
import RecordWizard from "@/components/RecordWizard";

export const metadata: Metadata = { title: "New building · Om Non Survey" };

// Content waits for the signed-in user (see Shell), so there is nothing to validate on the server.
export const instant = false;

export default function NewPage() {
  return <RecordWizard />;
}
