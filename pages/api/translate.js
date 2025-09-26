// pages/api/translate.js
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: true, message: "Method Not Allowed" });
  }

  try {
    const { text, target } = req.body || {};
    if (!text || !target) {
      return res.status(400).json({ error: true, message: "text & target required" });
    }

    const rawKey = process.env.DEEPL_API_KEY || process.env.DEEPL_API_TOKEN;
    if (!rawKey) {
      return res.status(500).json({ error: true, message: "Missing DEEPL_API_KEY in env" });
    }

    // DeepL 'Free' wymaga sufiksu :fx
    const auth_key = rawKey.endsWith(":fx") ? rawKey : `${rawKey}:fx`;

    const body = new URLSearchParams({
      auth_key,
      text,
      target_lang: String(target).toUpperCase(), // EN / DE / ES / UK ...
    });

    const resp = await fetch("https://api-free.deepl.com/v2/translate", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    const textResp = await resp.text();
    if (!resp.ok) {
      return res.status(resp.status).json({ error: true, message: textResp });
    }

    const json = JSON.parse(textResp);
    const translated = json?.translations?.[0]?.text ?? "";
    return res.status(200).json({ text: translated });
  } catch (e) {
    return res.status(500).json({ error: true, message: e?.message || "Unknown error" });
  }
}
