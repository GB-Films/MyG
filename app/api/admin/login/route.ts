import { createAdminSessionCookie, validateAdminCredentials } from "../../../admin-auth";

export async function POST(request: Request) {
  const form = await request.formData();
  const username = String(form.get("username") ?? "").trim().slice(0, 120);
  const password = String(form.get("password") ?? "").slice(0, 200);

  if (!await validateAdminCredentials(username, password)) {
    return new Response(null, {
      status: 303,
      headers: { Location: "/admin?error=1" },
    });
  }

  return new Response(null, {
    status: 303,
    headers: {
      Location: "/admin",
      "Set-Cookie": await createAdminSessionCookie(username),
    },
  });
}
