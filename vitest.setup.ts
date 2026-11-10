import fs from "node:fs";
import path from "node:path";

// Some lib/ modules (e.g. lib/rankedVoteSession.ts) import supabaseClient
// (lib/supabase/client.ts) at module scope purely to use it in a handful
// of DB-access functions — importing the file at all, even just to test
// its other, pure functions, still runs that top-level createClient()
// call, which throws if these env vars are missing. Unlike Next.js itself,
// Vite/vitest doesn't load .env.local into process.env on its own, so this
// does it by hand — real values aren't needed for a pure-function test,
// but createClient() still needs *something* well-formed to construct
// without error.
const envPath = path.resolve(import.meta.dirname, ".env.local");
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf8");
  content.split(/\r?\n/).forEach((line) => {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].trim().replace(/^["']|["']$/g, "");
    }
  });
}
