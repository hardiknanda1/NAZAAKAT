import { directRoom } from "@/lib/meeting";

// "Start Consultation" buttons land here and go straight into the consultation room.
export function GET(request: Request) {
  return Response.redirect(new URL(`/consultation/${directRoom()}`, request.url), 307);
}
