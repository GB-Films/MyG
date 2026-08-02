import { clearAdminSessionCookie } from "../../../admin-auth";

export async function POST() {
  return new Response(null, {
    status: 303,
    headers: {
      Location: "/admin",
      "Set-Cookie": clearAdminSessionCookie(),
    },
  });
}
