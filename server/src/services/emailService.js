// services/emailService.js
// ─────────────────────────────────────────────────────────────────────────────
// Uses Resend (https://resend.com) — HTTP API, not SMTP.
// Render cannot block this. Free tier: 3,000 emails/month.
//
// SETUP (5 minutes):
// 1. Go to https://resend.com and create a free account
// 2. Go to API Keys → Create API Key → copy it
// 3. Go to Domains → Add Domain → add bemsfarms.com (or use onboarding@resend.dev for testing)
// 4. Add to Render environment variables:
//      RESEND_API_KEY = re_xxxxxxxxxxxx
//      EMAIL_FROM     = noreply@bemsfarms.com  (or onboarding@resend.dev for testing)
// ─────────────────────────────────────────────────────────────────────────────

const { Resend } = require("resend");

const IS_TEST = !process.env.RESEND_API_KEY;
const resend = IS_TEST ? null : new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.EMAIL_FROM || "onboarding@resend.dev";

if (IS_TEST) {
  console.log(
    "⚠️  Email in TEST MODE — RESEND_API_KEY not set. Emails will be logged only.",
  );
} else {
  console.log(`✅ Resend email ready — sending from: ${FROM}`);
}

// ── Core send helper ──────────────────────────────────────────────────────────
async function sendMail({ to, subject, html }) {
  if (IS_TEST) {
    console.log(`📧 [EMAIL TEST] To: ${to} | Subject: ${subject}`);
    return { status: "test" };
  }
  try {
    const { data, error } = await resend.emails.send({
      from: `BemsFarms 🌿 <${FROM}>`,
      to,
      subject,
      html,
    });
    if (error) {
      console.error(`❌ Resend error to ${to}:`, error);
      return { status: "failed", error };
    }
    console.log(`✅ Email sent to ${to} — ID: ${data.id}`);
    return { status: "sent", id: data.id };
  } catch (err) {
    console.error(`❌ Email failed to ${to}:`, err.message);
    return { status: "failed", error: err.message };
  }
}

// ── Shared styles ─────────────────────────────────────────────────────────────
const emailStyles = `font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;`;

const header = (title) => `
  <div style="background: linear-gradient(135deg, #1B4332, #40916C); padding: 32px 40px; border-radius: 16px 16px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 800;">🌿 BemsFarms</h1>
    <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0; font-size: 14px;">Premium Farm Produce</p>
  </div>
  <div style="background: #F59E0B; height: 4px;"></div>
  <div style="padding: 32px 40px; background: white;">
    <h2 style="color: #1B4332; margin: 0 0 16px; font-size: 22px;">${title}</h2>
`;

const footer = `
  </div>
  <div style="background: #1B4332; padding: 24px 40px; border-radius: 0 0 16px 16px; text-align: center;">
    <p style="color: rgba(255,255,255,0.7); margin: 0; font-size: 13px;">
      © 2026 BemsFarms | Lagos, Nigeria | <a href="mailto:hello@bemsfarms.ng" style="color: #52B788;">hello@bemsfarms.ng</a>
    </p>
  </div>
`;

// ── Email functions ───────────────────────────────────────────────────────────

async function sendWelcomeEmail(user, verifyUrl) {
  return sendMail({
    to: user.email,
    subject: "🌿 Welcome to BemsFarms — Verify Your Email",
    html: `<div style="${emailStyles}">
      ${header(`Welcome, ${user.name}! 👋`)}
      <p style="color: #4B5563; line-height: 1.7;">
        Thank you for joining BemsFarms — Nigeria's freshest farm marketplace.
        Please verify your email to get started and claim your
        <strong style="color: #F59E0B;">10% welcome discount</strong>.
      </p>
      <div style="text-align: center; margin: 24px 0;">
        <a href="${verifyUrl}" style="background: #40916C; color: white; padding: 14px 32px;
          border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 15px;
          display: inline-block;">Verify My Email →</a>
      </div>
      <p style="color: #9CA3AF; font-size: 12px;">This link expires in 24 hours.</p>
      ${footer}
    </div>`,
  });
}

async function sendOrderConfirmationEmail(order, user, items) {
  const itemsHtml = items
    .map(
      (item) => `
    <tr>
      <td style="padding: 10px 0; border-bottom: 1px solid #F3F4F6; color: #4B5563;">${item.name}</td>
      <td style="padding: 10px 0; border-bottom: 1px solid #F3F4F6; text-align: center; color: #4B5563;">${item.quantity}</td>
      <td style="padding: 10px 0; border-bottom: 1px solid #F3F4F6; text-align: right; font-weight: 700; color: #1B4332;">
        ₦${(item.price * item.quantity).toLocaleString()}
      </td>
    </tr>
  `,
    )
    .join("");

  return sendMail({
    to: user.email,
    subject: `✅ Order #${order.id} Confirmed — BemsFarms`,
    html: `<div style="${emailStyles}">
      ${header(`Order Confirmed! 🎉`)}
      <p style="color: #4B5563;">Your order <strong>#${order.id}</strong> has been received and is being prepared.</p>
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <thead>
          <tr style="background: #F8FAF9;">
            <th style="padding: 10px; text-align: left; color: #6B7280; font-size: 12px; text-transform: uppercase;">Product</th>
            <th style="padding: 10px; text-align: center; color: #6B7280; font-size: 12px; text-transform: uppercase;">Qty</th>
            <th style="padding: 10px; text-align: right; color: #6B7280; font-size: 12px; text-transform: uppercase;">Price</th>
          </tr>
        </thead>
        <tbody>${itemsHtml}</tbody>
        <tfoot>
          <tr>
            <td colspan="2" style="padding: 14px 0; font-weight: 800; color: #1B4332; font-size: 16px;">Total</td>
            <td style="padding: 14px 0; text-align: right; font-weight: 800; color: #1B4332; font-size: 18px;">
              ₦${parseFloat(order.total).toLocaleString()}
            </td>
          </tr>
        </tfoot>
      </table>
      <div style="background: #F0FFF4; border-left: 4px solid #40916C; padding: 14px 16px; border-radius: 8px; margin: 16px 0;">
        <p style="margin: 0; color: #1B4332; font-weight: 600; font-size: 14px;">
          📍 Delivering to: ${order.address || "Your saved address"}
        </p>
      </div>
      <p style="color: #9CA3AF; font-size: 13px;">
        Estimated delivery: <strong>2-4 hours</strong> (Lagos) or <strong>1-3 days</strong> (other states)
      </p>
      ${footer}
    </div>`,
  });
}

async function sendOrderStatusEmail(order, user, newStatus) {
  const statusMessages = {
    confirmed: {
      emoji: "✅",
      title: "Order Confirmed",
      msg: "Your order has been confirmed and is being packed.",
    },
    being_packed: {
      emoji: "📦",
      title: "Order Being Packed",
      msg: "Your fresh produce is being carefully packed right now.",
    },
    out_for_delivery: {
      emoji: "🚚",
      title: "Out for Delivery!",
      msg: "Your order is on its way! Expect delivery within 2 hours.",
    },
    delivered: {
      emoji: "🎉",
      title: "Delivered Successfully!",
      msg: "Your order has been delivered. Enjoy your fresh produce!",
    },
    cancelled: {
      emoji: "❌",
      title: "Order Cancelled",
      msg: "Your order has been cancelled. A refund will be processed within 3-5 days.",
    },
  };
  const s = statusMessages[newStatus] || {
    emoji: "📋",
    title: "Order Update",
    msg: "Your order status has been updated.",
  };

  return sendMail({
    to: user.email,
    subject: `${s.emoji} Order #${order.id} — ${s.title}`,
    html: `<div style="${emailStyles}">
      ${header(`${s.emoji} ${s.title}`)}
      <p style="color: #4B5563;">${s.msg}</p>
      <div style="background: #F8FAF9; border-radius: 12px; padding: 16px; margin: 16px 0; text-align: center;">
        <p style="font-size: 14px; color: #6B7280; margin: 0 0 4px;">Order ID</p>
        <p style="font-size: 20px; font-weight: 800; color: #1B4332; margin: 0;">#${order.id}</p>
      </div>
      ${footer}
    </div>`,
  });
}

async function sendSubscriptionWelcomeEmail(email, referralCode, discountCode = "BEMS10") {
  const domain = process.env.FRONTEND_URL || "https://bemsfarms.com";
  const referralLink = `${domain}/?ref=${referralCode}`;

  return sendMail({
    to: email,
    subject: "🌿 You're subscribed to BemsFarms — Here's your welcome discount!",
    html: `<div style="${emailStyles}">
      ${header(`You're on the list! 🎉`)}
      <p style="color: #4B5563; line-height: 1.7;">
        Welcome to the BemsFarms family! You'll receive weekly deals, fresh produce alerts, and exclusive discounts.
      </p>
      <div style="background: linear-gradient(135deg, #F59E0B, #F97316); border-radius: 16px; padding: 24px; text-align: center; margin: 20px 0;">
        <p style="color: rgba(255,255,255,0.85); font-size: 14px; margin: 0 0 6px;">Your welcome discount code:</p>
        <p style="color: white; font-size: 32px; font-weight: 900; margin: 0; letter-spacing: 3px;">${discountCode}</p>
        <p style="color: rgba(255,255,255,0.75); font-size: 12px; margin: 8px 0 0;">Valid on your next purchase</p>
      </div>
      <div style="background: #F0FFF4; border-left: 4px solid #40916C; padding: 18px; border-radius: 12px; margin: 24px 0; text-align: left;">
        <p style="margin: 0 0 8px; color: #1B4332; font-weight: 700; font-size: 15px;">📣 Share & Get Higher Discounts!</p>
        <p style="margin: 0 0 12px; color: #4B5563; font-size: 13px; line-height: 1.5;">
          Invite your friends! When 3 friends sign up using your unique link below, we will automatically email you an upgraded <strong>20% discount coupon</strong>!
        </p>
        <div style="background: white; border: 1px dashed #40916C; padding: 10px; border-radius: 8px; font-family: monospace; font-size: 12px; color: #1B4332; word-break: break-all; text-align: center;">
          ${referralLink}
        </div>
      </div>
      ${footer}
    </div>`,
  });
}

async function sendPasswordResetEmail(user, resetUrl) {
  return sendMail({
    to: user.email,
    subject: "🔐 Reset Your BemsFarms Password",
    html: `<div style="${emailStyles}">
      ${header("Password Reset Request")}
      <p style="color: #4B5563;">
        Someone requested a password reset for your BemsFarms account. If this wasn't you, ignore this email.
      </p>
      <div style="text-align: center; margin: 24px 0;">
        <a href="${resetUrl}" style="background: #1B4332; color: white; padding: 14px 32px;
          border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 15px;
          display: inline-block;">Reset My Password →</a>
      </div>
      <p style="color: #9CA3AF; font-size: 12px;">This link expires in 1 hour. Never share this link.</p>
      ${footer}
    </div>`,
  });
}

async function sendReferralUpgradeEmail(email, count, newCode) {
  return sendMail({
    to: email,
    subject: `🎉 Upgrade Alert: You've referred ${count} friends!`,
    html: `<div style="${emailStyles}">
      ${header(`Level Up! 🌟`)}
      <p style="color: #4B5563; line-height: 1.7;">
        Amazing job! You have successfully referred <strong>${count} friends</strong> to BemsFarms. 
        As a thank you, we have upgraded your discount code!
      </p>
      <div style="background: linear-gradient(135deg, #1B4332, #40916C); border-radius: 16px; padding: 24px; text-align: center; margin: 20px 0;">
        <p style="color: rgba(255,255,255,0.85); font-size: 14px; margin: 0 0 6px;">Your upgraded discount code:</p>
        <p style="color: white; font-size: 32px; font-weight: 900; margin: 0; letter-spacing: 3px;">${newCode}</p>
        <p style="color: rgba(255,255,255,0.75); font-size: 12px; margin: 8px 0 0;">Valid on your next order</p>
      </div>
      <p style="color: #4B5563; line-height: 1.7;">
        Keep sharing your link to unlock even higher tiers!
      </p>
      ${footer}
    </div>`,
  });
}

module.exports = {
  sendWelcomeEmail,
  sendOrderConfirmationEmail,
  sendOrderStatusEmail,
  sendSubscriptionWelcomeEmail,
  sendPasswordResetEmail,
  sendReferralUpgradeEmail,
};
