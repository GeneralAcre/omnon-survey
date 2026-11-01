import { Suspense } from "react";
import RecordDetail from "@/components/RecordDetail";

// Content waits for the signed-in user (see Shell), so there is nothing to validate on the server.
export const instant = false;

export default function RecordPage() {
  return (
    <Suspense fallback={<div className="flex-1" />}>
      <RecordDetail />
    </Suspense>
  );
}
