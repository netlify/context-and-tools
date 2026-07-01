import type { Context } from "@netlify/edge-functions";

// Existing auth gate. It is NOT yet wired to any path in netlify.toml.
export default async (request: Request, context: Context) => {
  const cookie = request.headers.get("cookie") ?? "";
  if (!cookie.includes("session=")) {
    return new Response("Unauthorized", { status: 401 });
  }
  return context.next();
};
