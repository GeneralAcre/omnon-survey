import { Suspense } from "react";
import EditRecord from "@/components/EditRecord";

export default function EditPage() {
  return (
    <Suspense fallback={<div className="flex-1" />}>
      <EditRecord />
    </Suspense>
  );
}
