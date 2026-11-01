import type { Metadata } from "next";
import RecordList from "@/components/RecordList";

export const metadata: Metadata = { title: "Survey · Om Non Survey" };

// Content waits for the signed-in user (see Shell), so there is nothing to validate on the server.
export const instant = false;

export default function SurveyPage() {
  return <RecordList />;
}
