import { Suspense } from "react";
import EditRecord from "@/components/EditRecord";

// Content waits for the signed-in user (see Shell), so there is nothing to validate on the server.
export const instant = false;

export default function EditPage() {
  return (
    <Suspense fallback={<div className="flex-1" />}>
      <EditRecord />
    </Suspense>
  );
}
