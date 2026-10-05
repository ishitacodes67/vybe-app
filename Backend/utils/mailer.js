/**
 * Email helper.
 *
 * Priority:
 *   1. Gmail SMTP (if GMAIL_USER + GMAIL_APP_PASSWORD set) — works for ANY recipient
 *   2. Resend API (if RESEND_API_KEY set) — limited to verified recipients
 *   3. Console log fallback — always works, prints email to Render logs
 *
 * Any student's Gmail can be the recipient. Your Gmail is just the sender.
 */

let nodemailer = null;
try {
  nodemailer = require("nodemailer");
} catch {
  // nodemailer not installed — fine, we'll fall back
}

async function sendViaGmail({ to, subject, html, text }) {
  const user = (process.env.GMAIL_USER || "").trim();
  const pass = (process.env.GMAIL_APP_PASSWORD || "").trim();

  if (!user || !pass || !nodemailer) return null;

  try {
    const transport = nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass }
    });

    const info = await transport.sendMail({
      from: `"VYBE" <${user}>`,
      to,
      subject,
      text,
      html
    });

    console.log(`[mailer] Gmail sent to ${to} (id: ${info.messageId})`);
    return { ok: true, mode: "gmail", id: info.messageId };
  } catch (err) {
    console.error("[mailer] Gmail SMTP failed:", err.message);
    return null;
  }
}

async function sendViaResend({ to, subject, html, text }) {
  const apiKey = (process.env.RESEND_API_KEY || "").trim();
  if (!apiKey) return null;

  const from = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ from, to, subject, html, text })
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`Resend ${res.status}: ${errText}`);
    }

    const data = await res.json();
    console.log(`[mailer] Resend sent to ${to} (id: ${data.id})`);
    return { ok: true, mode: "resend", id: data.id };
  } catch (err) {
    console.error("[mailer] Resend failed:", err.message);
    return null;
  }
}

async function sendEmail({ to, subject, html, text }) {
  // 1. Try Gmail first
  let result = await sendViaGmail({ to, subject, html, text });
  if (result) return result;

  // 2. Then Resend
  result = await sendViaResend({ to, subject, html, text });
  if (result) return result;

  // 3. Console fallback
  console.log("\n========== [mailer] EMAIL (console fallback) ==========");
  console.log("To:      ", to);
  console.log("Subject: ", subject);
  console.log("Text:    ", text || "(no text)");
  if (html) {
    const plain = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    console.log("Preview: ", plain.slice(0, 300));
  }
  console.log("======================================================\n");

  return { ok: true, mode: "console" };
}

module.exports = { sendEmail };