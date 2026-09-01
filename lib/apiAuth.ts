// Shared guard for the /api/chat and /api/discord/* route handlers. Reuses
// PasswordGate's own shared password (already public in the client bundle
// via NEXT_PUBLIC_MATCH_PASSWORD — see components/PasswordGate.tsx) so an
// unlocked client can call these routes without a separate login, while a
// stranger who finds the URL directly can't blindly burn Gemini/Discord
// quota. Same trust boundary as PasswordGate itself, not a hard barrier.
export function requireSharedAuth(request: Request): Response | null {
  const expected = process.env.NEXT_PUBLIC_MATCH_PASSWORD;
  const provided = request.headers.get("x-goa-auth");
  if (!expected || provided !== expected) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
