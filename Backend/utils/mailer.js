/**
 * Email helper.
 *
 * Sends via Resend if RESEND_API_KEY is set.
 * Otherwise, logs the email content to the server console (useful for dev/demo).
 *
 * Uses Node 18+ native fetch — no npm package required.
 */

const RESEND_ENDPOINT = "https://api.resend.com/emails";

async function sendEmail({ to, subject, html, text }) {
  const apiKey = (process.env.RESEND_API_KEY || "").trim();
  const from = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

  // ---- Fallback: no API key ----
  if (!apiKey) {
    console.log("\n========== [mailer] EMAIL (console fallback) ==========");
    console.log("To:      ", to);
    console.log("From:    ", from);
    console.log("Subject: ", subject);
    console.log("Text:    ", text || "(no text)");
    if (html) {
      console.log("HTML length:", html.length, "chars");
      // Strip tags for a readable console preview
      const plain = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
      console.log("HTML preview:", plain.slice(0, 300));
    }
    console.log("======================================================\n");
    return { ok: true, mode: "console" };
  }

  // ---- Resend API ----
  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ from, to, subject, html, text })
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`Resend responded ${res.status}: ${errText}`);
    }

    const data = await res.json();
    return { ok: true, mode: "resend", id: data.id };
  } catch (err) {
    console.error("[mailer] Resend failed, email not delivered:", err.message);

    // Log anyway so the user can still get their link during a demo
    console.log("\n========== [mailer] FALLBACK (Resend failed) ==========");
    console.log("To:      ", to);
    console.log("Subject: ", subject);
    console.log("Text:    ", text);
    console.log("======================================================\n");

    return { ok: false, mode: "fallback", error: err.message };
  }
}

module.exports = { sendEmail };