import { ChatTurn } from "@/lib/chat";

// GEMINI_MODEL defaults to the Flash-Lite tier for lower latency/cost per
// request. Pinned to a specific dated id rather than a rolling "-latest"
// alias — unlike the main Flash tier, no "-lite-latest" alias exists, so
// this may need bumping to a newer dated id if Google retires this one;
// the env var can override it in the meantime without a code change.
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";

// Plain REST call rather than the @google/genai SDK — this generateContent
// request shape is Google's long-stable public REST contract, and using it
// directly avoids adding an SDK dependency (and its own version/API-shape
// churn) for what's a single HTTP call.
export async function generateChatReply({
  systemInstruction,
  history,
  message,
}: {
  systemInstruction: string;
  history: ChatTurn[];
  message: string;
}): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const contents = [
    ...history.map((turn) => ({
      role: turn.role,
      parts: [{ text: turn.text }],
    })),
    { role: "user", parts: [{ text: message }] },
  ];

  const res = await fetch(
    `${GEMINI_API_BASE}/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemInstruction }] },
        contents,
        // Low, not zero — 0 can make some Gemini models loop/degrade on
        // longer outputs. This is a mitigation, not a guarantee: a lower
        // temperature makes the model more literal about reciting facts
        // already in its context, but it doesn't eliminate the
        // possibility of a wrong synthesis on any given answer.
        generationConfig: { temperature: 0.1 },
      }),
    },
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${body}`);
  }

  const data = await res.json();
  const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof reply !== "string") {
    throw new Error("Gemini API returned no reply text");
  }
  return reply;
}
