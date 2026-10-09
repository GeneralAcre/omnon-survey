import { createUploadTicket } from "@/lib/photos";

// Hands the phone a fresh photo name plus where to PUT the full image and thumbnail.
export async function POST() {
  return Response.json(await createUploadTicket(), { status: 201 });
}
