// Vercel serverless function: /api/assist
// Needs the environment variable ANTHROPIC_API_KEY (set in Vercel).

const SUPABASE_URL = "https://qleoqpmxvmqcythacszw.supabase.co";
const SUPABASE_KEY = "sb_publishable_-rvHVSnw6yw0_Zb-jxozVw_Fma9NccJ";
const ADMIN_ID = "280627ab-6dfb-4f45-ae11-b5fc14288eb5";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5";
const MAX_INPUT = 12000;

const BASE =
  "You are an editorial assistant for Nexora News, a UK news site covering " +
  "London, the UK, the world, business, technology and sports. " +
  "Write in clear British English. Use only the facts you are given: never " +
  "invent names, quotes, numbers, dates or sources. If an important detail " +
  "is missing, write [CHECK: what is missing] in its place. The input may be " +
  "in Hausa or English; always answer in English. Return only the requested " +
  "text, with no introduction or explanation.";

const TASKS = {
  headlines:
    "Suggest 5 different headlines for this story. Maximum 12 words each, " +
    "factual, no clickbait, sentence case. One per line, with no numbering, " +
    "bullets or quotation marks.",
  excerpt:
    "Write a short description of this story for a homepage card: 1 or 2 " +
    "sentences, maximum 35 words. Return only that text.",
  polish:
    "Fix spelling, grammar, punctuation and clarity. Keep the meaning, the " +
    "facts and the paragraph structure. Do not add new information. Return " +
    "the full corrected article.",
  draft:
    "Turn these notes into a news article of 250 to 400 words. Open with a " +
    "strong first paragraph covering who, what, when and where. Use short " +
    "paragraphs separated by a blank line and a neutral tone. Use only the " +
    "facts in the notes.",
  translate:
    "Translate this text into natural, journalistic English. Keep the " +
    "meaning and the paragraph breaks. Do not add or remove information."
};

async function isAdmin(token) {
  try {
    const r = await fetch(SUPABASE_URL + "/auth/v1/user", {
      headers: { apikey: SUPABASE_KEY, Authorization: "Bearer " + token }
    });
    if (!r.ok) return false;
    const user = await r.json();
    return user && user.id === ADMIN_ID;
  } catch (e) {
    return false;
  }
}

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed." });
  }

  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";

  if (!token || !(await isAdmin(token))) {
    return res.status(401).json({ error: "Please log in again." });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: "ANTHROPIC_API_KEY is not set in Vercel." });
  }

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch (e) { body = {}; }
  }
  body = body || {};

  const task = TASKS[body.action];
  const text = String(body.text || "").trim();

  if (!task) {
    return res.status(400).json({ error: "Unknown action." });
  }
  if (!text) {
    return res.status(400).json({ error: "Add some text or notes first." });
  }
  if (text.length > MAX_INPUT) {
    return res.status(400).json({ error: "Text is too long. Please shorten it." });
  }

  const context =
    (body.title ? "Headline: " + String(body.title).slice(0, 300) + "\n" : "") +
    (body.category ? "Category: " + String(body.category).slice(0, 50) + "\n" : "");

  const userMessage = task + "\n\n" + context + "\nTEXT:\n" + text;

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1600,
        system: BASE,
        messages: [{ role: "user", content: userMessage }]
      })
    });

    const data = await r.json();

    if (!r.ok) {
      console.error("Anthropic error:", data);
      return res.status(502).json({ error: "The AI service returned an error. Try again." });
    }

    const result = (data.content || [])
      .filter(b => b.type === "text")
      .map(b => b.text)
      .join("")
      .trim();

    return res.status(200).json({ result });
  } catch (e) {
    console.error(e);
    return res.status(502).json({ error: "Could not reach the AI service. Try again." });
  }
};