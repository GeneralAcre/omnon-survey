import { Suspense } from "react";
import RecordDetail from "@/components/RecordDetail";

export default function RecordPage() {
  return (
    <Suspense fallback={<div className="flex-1" />}>
      <RecordDetail />
    </Suspense>
  );
}
