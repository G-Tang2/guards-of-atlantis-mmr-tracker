// Shared guard for the /api/chat, /api/matches/*, and /api/discord/* route
// handlers. Reuses PasswordGate's own shared password (already public in
// the client bundle via NEXT_PUBLIC_MATCH_PASSWORD — see
// components/PasswordGate.tsx) so an unlocked client can call these routes
// without a separate login, while a stranger who finds the URL directly
// can't blindly burn Gemini/Discord quota. Same trust boundary as
// PasswordGate itself, not a hard barrier.
export function requireSharedAuth(request: Request): Response | null {
  const expected = process.env.NEXT_PUBLIC_MATCH_PASSWORD;
  const provided = request.headers.get("x-goa-auth");
  if (!expected || provided !== expected) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

// Client-side counterpart to requireSharedAuth above — attach to any
// fetch() call into a route guarded by it. NEXT_PUBLIC_MATCH_PASSWORD is
// already inlined into the client bundle (PasswordGate itself reads it
// the same way to check the unlock form), so sending it as a header here
// doesn't expose anything new.
export function sharedAuthHeaders(): Record<string, string> {
  const password = process.env.NEXT_PUBLIC_MATCH_PASSWORD;
  return password ? { "x-goa-auth": password } : {};
}
