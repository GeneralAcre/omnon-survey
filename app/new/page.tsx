import type { Metadata } from "next";
import RecordWizard from "@/components/RecordWizard";

export const metadata: Metadata = { title: "New building · Om Non Survey" };

export default function NewPage() {
  return <RecordWizard />;
}
