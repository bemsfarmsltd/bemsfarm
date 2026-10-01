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
async function sendMail({ to, subject, html, attachments }) {
  const recipientDisplay = Array.isArray(to) ? to.join(", ") : to;
  if (IS_TEST) {
    console.log(`📧 [EMAIL TEST] To: ${recipientDisplay} | Subject: ${subject}`);
    return { status: "test" };
  }
  try {
    const payload = {
      from: `BemsFarms 🌿 <${FROM}>`,
      to,
      subject,
      html,
    };
    if (attachments && Array.isArray(attachments) && attachments.length > 0) {
      payload.attachments = attachments;
    }
    const { data, error } = await resend.emails.send(payload);
    if (error) {
      console.error(`❌ Resend error to ${recipientDisplay}:`, error);
      return { status: "failed", error };
    }
    console.log(`✅ Email sent to ${recipientDisplay} — ID: ${data?.id}`);
    return { status: "sent", id: data?.id };
  } catch (err) {
    console.error(`❌ Email failed to ${recipientDisplay}:`, err.message);
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
      © 2026 BemsFarms | Abia State, Nigeria | <a href="mailto:info@bemsfarms.com" style="color: #52B788;">info@bemsfarms.com</a>
    </p>
  </div>
`;

// ── Email functions ───────────────────────────────────────────────────────────

async function sendWelcomeEmail(user, otp) {
  return sendMail({
    to: user.email,
    subject: "🌿 Welcome to BemsFarms — Verify Your Email",
    html: `<div style="${emailStyles}">
      ${header(`Welcome, ${user.name}! 👋`)}
      <p style="color: #4B5563; line-height: 1.7;">
        Thank you for joining BemsFarms — Nigeria's freshest farm marketplace.
        Please verify your email using the verification code below to get started and claim your
        <strong style="color: #F59E0B;">10% welcome discount</strong>.
      </p>
      <div style="background: #F8FAF9; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
        <p style="font-size: 14px; color: #6B7280; margin: 0 0 8px;">Your verification code is:</p>
        <p style="font-size: 36px; font-weight: 900; color: #1B4332; margin: 0; letter-spacing: 6px;">${otp}</p>
      </div>
      <p style="color: #9CA3AF; font-size: 12px;">This code expires in 15 minutes.</p>
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
        Estimated delivery: <strong>2-4 hours</strong> (Abia State) or <strong>1-3 days</strong> (other states)
      </p>
      ${footer}
    </div>`,
  });
}

async function sendOrderStatusEmail(order, user, newStatus, deliveryDetails = {}) {
  const domain = process.env.FRONTEND_URL || "https://bemsfarms.com";
  const trackingCode = order.id || order.order_ref || "";
  const trackingUrl = `${domain}/track-order?code=${encodeURIComponent(trackingCode)}`;
  const deliveryRef = deliveryDetails.delivery_ref || order.delivery_ref || `DEL-${String(trackingCode).replace(/[^A-Z0-9]/gi, '')}`;

  const statusMessages = {
    confirmed: {
      emoji: "✅",
      title: "Order Confirmed & Processing",
      msg: "Your fresh farm order has been confirmed and is being prepared by our packaging team.",
    },
    being_packed: {
      emoji: "📦",
      title: "Order Packed & Ready",
      msg: "Your fresh produce is neatly packed and awaiting courier pickup.",
    },
    en_route: {
      emoji: "🚚",
      title: "Your Order is In Transit / Out for Delivery!",
      msg: "Great news! Your courier is on the way with your delivery.",
    },
    out_for_delivery: {
      emoji: "🚚",
      title: "Your Order is In Transit / Out for Delivery!",
      msg: "Great news! Your courier is on the way with your delivery.",
    },
    arrived: {
      emoji: "📍",
      title: "Courier Has Arrived at Your Location",
      msg: "Your delivery courier has arrived at your doorstep. Please step out to receive your package.",
    },
    delivered: {
      emoji: "🎉",
      title: "Order Delivered Successfully!",
      msg: "Your order has been delivered. Thank you for choosing BemsFarms fresh produce!",
    },
    cancelled: {
      emoji: "❌",
      title: "Order Cancelled",
      msg: "Your order has been cancelled. If you have already paid, a refund will be processed.",
    },
  };

  const s = statusMessages[newStatus] || {
    emoji: "📋",
    title: "Delivery Status Update",
    msg: "There is a new update regarding your delivery.",
  };

  const driverSection = deliveryDetails.driver_name ? `
    <div style="background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 12px; padding: 14px 18px; margin: 16px 0; text-align: left;">
      <p style="margin: 0 0 6px; font-weight: 700; color: #166534; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">🚚 Assigned Courier</p>
      <p style="margin: 0; font-size: 15px; font-weight: 700; color: #14532D;">${deliveryDetails.driver_name} ${deliveryDetails.vehicle_type ? `(${deliveryDetails.vehicle_type})` : ''}</p>
      ${deliveryDetails.eta_minutes ? `<p style="margin: 4px 0 0; font-size: 12px; color: #15803D;">Estimated Arrival: <strong>~${deliveryDetails.eta_minutes} mins</strong></p>` : ''}
    </div>
  ` : '';

  return sendMail({
    to: user.email,
    subject: `${s.emoji} Order #${order.id} [${deliveryRef}] — ${s.title}`,
    html: `<div style="${emailStyles}">
      ${header(`${s.emoji} ${s.title}`)}
      <p style="color: #4B5563; font-size: 15px; line-height: 1.6;">Hello <strong>${user.name || "Valued Customer"}</strong>,</p>
      <p style="color: #4B5563; font-size: 14px; line-height: 1.6;">${s.msg}</p>
      
      <div style="background: #F8FAF9; border-radius: 12px; padding: 16px; margin: 16px 0; display: table; width: 100%; box-sizing: border-box;">
        <table style="width: 100%;">
          <tr>
            <td style="text-align: left; padding: 4px 0;">
              <span style="font-size: 12px; color: #6B7280; text-transform: uppercase;">Order Reference</span><br/>
              <strong style="font-size: 16px; color: #1B4332;">#${order.id}</strong>
            </td>
            <td style="text-align: right; padding: 4px 0;">
              <span style="font-size: 12px; color: #6B7280; text-transform: uppercase;">Delivery ID</span><br/>
              <strong style="font-size: 16px; color: #0284C7;">${deliveryRef}</strong>
            </td>
          </tr>
        </table>
      </div>

      ${driverSection}

      ${order.address ? `
        <div style="background: #F8FAF9; border-left: 4px solid #10B981; padding: 12px 16px; border-radius: 6px; margin: 16px 0; text-align: left;">
          <p style="margin: 0; color: #374151; font-size: 13px;">
            📍 <strong>Destination:</strong> ${order.address}
          </p>
        </div>
      ` : ''}

      <div style="text-align: center; margin: 28px 0 20px;">
        <a href="${trackingUrl}" style="background: #143C2D; color: #ffffff; text-decoration: none; padding: 14px 28px; font-size: 14px; font-weight: 700; border-radius: 10px; display: inline-block; box-shadow: 0 4px 12px rgba(20,60,45,0.25);">
          📍 Track Live Delivery Progress →
        </a>
      </div>

      <p style="text-align: center; color: #9CA3AF; font-size: 12px; margin-top: 10px;">
        Or enter code <strong>${trackingCode}</strong> at <a href="${domain}/track-order" style="color: #10B981;">bemsfarms.com/track-order</a>
      </p>

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

async function sendLowStockAlertEmail(toEmail, items) {
  const itemsHtml = items.map(item => `
    <tr style="border-bottom: 1px solid #f3f4f6;">
      <td style="padding: 10px; font-size: 13px; color: #111827;">${item.name}</td>
      <td style="padding: 10px; font-size: 13px; color: #4B5563;">${item.sku || "N/A"}</td>
      <td style="padding: 10px; font-size: 13px; font-weight: 700; color: #dc2626;">${item.stock}</td>
      <td style="padding: 10px; font-size: 13px; color: #9CA3AF;">${item.low_stock_threshold}</td>
    </tr>
  `).join("");

  return sendMail({
    to: toEmail,
    subject: "⚠️ Low Stock Alert: Items require replenishment",
    html: `<div style="${emailStyles}">
      ${header(`Low Stock Alert ⚠️`)}
      <p style="color: #4B5563; line-height: 1.7;">
        The following items have dropped below their designated reorder thresholds and require replenishment:
      </p>
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0; text-align: left;">
        <thead>
          <tr style="background: #f9fafb; border-bottom: 2px solid #e5e7eb;">
            <th style="padding: 10px; font-size: 12px; font-weight: 700; color: #374151;">Product</th>
            <th style="padding: 10px; font-size: 12px; font-weight: 700; color: #374151;">SKU</th>
            <th style="padding: 10px; font-size: 12px; font-weight: 700; color: #dc2626;">Current Stock</th>
            <th style="padding: 10px; font-size: 12px; font-weight: 700; color: #374151;">Threshold</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>
      <div style="text-align: center; margin: 24px 0;">
        <a href="https://admin.bemsfarms.com/inventory" style="background: #dc2626; color: white; padding: 12px 28px;
          border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 14px;
          display: inline-block;">Manage Inventory →</a>
      </div>
      ${footer}
    </div>`,
  });
}

async function sendStaffInvitationEmail({ email, role, department, inviteUrl, invitedByName }) {
  const roleLabels = {
    superadmin:       "Super Administrator",
    admin:            "System Administrator",
    manager:          "Operations / Store Manager",
    inventory_manager:"Inventory Manager",
    sales_agent:      "Sales Agent",
    order_fulfillment:"Fulfillment Specialist",
    finance:          "Financial Auditor / Officer",
    customer_support: "Customer Support Officer",
  };
  const roleLabel = roleLabels[role] || role || "Staff Member";
  const inviterText = invitedByName ? ` by <strong>${invitedByName}</strong>` : "";
  const deptText = department ? ` in the <strong>${department}</strong> department` : "";

  return sendMail({
    to: email,
    subject: "🔐 You've been invited to join the BemsFarms Team",
    html: `<div style="${emailStyles}">
      ${header("Welcome to the BemsFarms Team! 🎉")}
      <p style="color: #374151; font-size: 15px; line-height: 1.7;">
        Hello,
      </p>
      <p style="color: #4B5563; line-height: 1.7;">
        You have been invited${inviterText} to join the <strong>BemsFarms Internal Portal</strong> as a <strong>${roleLabel}</strong>${deptText}.
      </p>
      <div style="background: #F8FAF9; border: 1px solid #E5E7EB; border-left: 4px solid #1B4332; border-radius: 8px; padding: 18px 20px; margin: 24px 0;">
        <div style="font-size: 12px; font-weight: 700; color: #6B7280; text-transform: uppercase; letter-spacing: 1px;">Your Assigned Role</div>
        <div style="font-size: 18px; font-weight: 800; color: #1B4332; margin-top: 4px;">${roleLabel}</div>
      </div>
      <div style="text-align: center; margin: 32px 0;">
        <a href="${inviteUrl}" style="background: linear-gradient(135deg, #1B4332, #2D6A4F); color: #ffffff; padding: 16px 36px;
          border-radius: 12px; text-decoration: none; font-weight: 800; font-size: 16px;
          display: inline-block; box-shadow: 0 4px 12px rgba(27, 67, 50, 0.25);">
          Complete Your Staff Account →
        </a>
      </div>
      <p style="color: #6B7280; font-size: 13px; line-height: 1.6;">
        If the button above does not work, copy and paste this link into your browser:<br/>
        <a href="${inviteUrl}" style="color: #1B4332; word-break: break-all;">${inviteUrl}</a>
      </p>
      <div style="background: #FEF3C7; border: 1px solid #FCD34D; border-radius: 8px; padding: 12px 16px; margin: 24px 0;">
        <p style="color: #92400E; font-size: 12px; margin: 0;">
          ⏳ <strong>Security Notice:</strong> This invitation link will expire in <strong>48 hours</strong>.
        </p>
      </div>
      ${footer}
    </div>`,
  });
}

async function sendDriverInvitationEmail({ email, name, inviteUrl, temporaryPin, vehicleType, invitedByName }) {
  const inviterText = invitedByName ? ` by <strong>${invitedByName}</strong>` : "";
  const vehicleLabel = vehicleType ? vehicleType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "Dispatch Vehicle";

  return sendMail({
    to: email,
    subject: "🛵 You've been invited to join BemsFarms as a Dispatch Driver!",
    html: `<div style="${emailStyles}">
      ${header("Welcome to the BemsFarms Delivery Fleet! 🛵")}
      <p style="color: #374151; font-size: 15px; line-height: 1.7;">
        Hello <strong>${name || "Driver Partner"}</strong>,
      </p>
      <p style="color: #4B5563; line-height: 1.7;">
        You have been invited${inviterText} to join the <strong>BemsFarms Dispatch &amp; Logistics Fleet</strong> as an official delivery driver (${vehicleLabel}).
      </p>
      
      <div style="background: #F8FAF9; border: 1px solid #E5E7EB; border-left: 4px solid #1B4332; border-radius: 8px; padding: 18px 20px; margin: 20px 0;">
        <div style="font-size: 12px; font-weight: 700; color: #6B7280; text-transform: uppercase; letter-spacing: 1px;">Onboarding Step Required</div>
        <div style="font-size: 16px; font-weight: 800; color: #1B4332; margin-top: 4px;">Complete Profile &amp; Upload Compliance Documents</div>
        <p style="font-size: 13px; color: #4B5563; margin: 8px 0 0 0; line-height: 1.5;">
          Please complete your profile details (NIN, Address, Next of Kin, Guarantor) and upload your <strong>Driver's License, Vehicle Papers, and NIN Slip</strong> so our compliance team can verify and activate your account.
        </p>
      </div>

      ${temporaryPin ? `
      <div style="background: #EFF6FF; border: 1px solid #BFDBFE; border-radius: 8px; padding: 14px 18px; margin: 16px 0;">
        <div style="font-size: 12px; font-weight: 700; color: #1E40AF; text-transform: uppercase;">Your Temporary Driver App PIN</div>
        <div style="font-size: 22px; font-weight: 900; color: #1E3A8A; letter-spacing: 4px; margin-top: 4px;">${temporaryPin}</div>
        <small style="color: #3B82F6; font-size: 11px;">You will use this PIN along with your phone number to sign in to the driver app once your documents are approved.</small>
      </div>` : ""}

      <div style="text-align: center; margin: 32px 0;">
        <a href="${inviteUrl}" style="background: linear-gradient(135deg, #1B4332, #2D6A4F); color: #ffffff; padding: 16px 36px;
          border-radius: 12px; text-decoration: none; font-weight: 800; font-size: 16px;
          display: inline-block; box-shadow: 0 4px 12px rgba(27, 67, 50, 0.25);">
          Start Driver Onboarding &amp; Upload Docs →
        </a>
      </div>

      <p style="color: #6B7280; font-size: 13px; line-height: 1.6;">
        If the button above does not work, copy and paste this link into your browser:<br/>
        <a href="${inviteUrl}" style="color: #1B4332; word-break: break-all;">${inviteUrl}</a>
      </p>

      <div style="background: #FEF3C7; border: 1px solid #FCD34D; border-radius: 8px; padding: 12px 16px; margin: 24px 0;">
        <p style="color: #92400E; font-size: 12px; margin: 0;">
          ⏳ <strong>Compliance Notice:</strong> This onboarding link will expire in <strong>7 days</strong>. All documents are reviewed securely by BemsFarms Operations.
        </p>
      </div>
      ${footer}
    </div>`,
  });
}

async function sendDriverApprovedEmail({ email, name, phone, loginUrl, driverPin }) {
  return sendMail({
    to: email,
    subject: "🎉 Congratulations! Your BemsFarms Driver Account is Approved & Active",
    html: `<div style="${emailStyles}">
      ${header("Compliance Approved — Welcome to the Fleet! 🎉")}
      <p style="color: #374151; font-size: 15px; line-height: 1.7;">
        Hello <strong>${name}</strong>,
      </p>
      <p style="color: #4B5563; line-height: 1.7;">
        Great news! Your compliance documents, identity verification, and vehicle registration have been <strong>officially approved</strong> by BemsFarms Logistics Management.
      </p>

      <div style="background: #ECFDF5; border: 1px solid #A7F3D0; border-left: 4px solid #059669; border-radius: 8px; padding: 18px 20px; margin: 20px 0;">
        <div style="font-size: 12px; font-weight: 700; color: #065F46; text-transform: uppercase; letter-spacing: 1px;">Account Status</div>
        <div style="font-size: 18px; font-weight: 800; color: #065F46; margin-top: 4px;">✅ Active &amp; Ready for Delivery Dispatches</div>
        <p style="font-size: 13px; color: #047857; margin: 6px 0 0 0;">
          Your account is fully activated. You are now eligible to receive real-time order delivery dispatches with automated navigation across your assigned zone.
        </p>
      </div>

      <div style="background: #F8FAF9; border: 1px solid #E5E7EB; border-radius: 8px; padding: 16px 20px; margin: 20px 0;">
        <div style="font-size: 12px; font-weight: 700; color: #4B5563; text-transform: uppercase; margin-bottom: 8px;">Your Driver Sign-In Details:</div>
        <div style="font-size: 14px; color: #111827; margin-bottom: 4px;"><strong>Email / Phone:</strong> <span style="font-family: monospace; font-size: 15px;">${email || phone}</span></div>
        <p style="font-size: 13px; color: #6B7280; margin: 6px 0 0 0;">
          Use the password you created during self-service registration to log in. Upon login, your driver commission wallet is automatically initialized.
        </p>
      </div>

      <div style="text-align: center; margin: 32px 0;">
        <a href="${loginUrl || "https://www.bemsfarms.com/driver"}" style="background: linear-gradient(135deg, #059669, #10B981); color: #ffffff; padding: 16px 36px;
          border-radius: 12px; text-decoration: none; font-weight: 800; font-size: 16px;
          display: inline-block; box-shadow: 0 4px 12px rgba(5, 150, 105, 0.25);">
          Sign In to Your Driver Account →
        </a>
      </div>

      <p style="color: #6B7280; font-size: 13px; line-height: 1.6;">
        For any assistance, contact BemsFarms Dispatch Operations via phone or email.
      </p>
      ${footer}
    </div>`,
  });
}

async function sendDriverRejectionEmail({ email, name, reasonNotes, reuploadUrl }) {
  return sendMail({
    to: email,
    subject: "⚠️ Action Required: BemsFarms Driver Compliance Review Update",
    html: `<div style="${emailStyles}">
      ${header("Compliance Document Correction Required ⚠️")}
      <p style="color: #374151; font-size: 15px; line-height: 1.7;">
        Hello <strong>${name}</strong>,
      </p>
      <p style="color: #4B5563; line-height: 1.7;">
        Our logistics compliance team reviewed your submitted driver onboarding documents and noticed a few items requiring correction or re-upload before your account can be activated.
      </p>

      <div style="background: #FEF2F2; border: 1px solid #FECACA; border-left: 4px solid #DC2626; border-radius: 8px; padding: 18px 20px; margin: 20px 0;">
        <div style="font-size: 12px; font-weight: 700; color: #991B1B; text-transform: uppercase;">Compliance Team Notes &amp; Required Fixes:</div>
        <p style="font-size: 14px; color: #7F1D1D; margin: 8px 0 0 0; line-height: 1.6; font-weight: 600;">
          "${reasonNotes || "Please provide clearer copies of your driver's license and vehicle registration document."}"
        </p>
      </div>

      <div style="text-align: center; margin: 32px 0;">
        <a href="${reuploadUrl}" style="background: linear-gradient(135deg, #DC2626, #EF4444); color: #ffffff; padding: 16px 36px;
          border-radius: 12px; text-decoration: none; font-weight: 800; font-size: 16px;
          display: inline-block; box-shadow: 0 4px 12px rgba(220, 38, 38, 0.25);">
          Re-Upload Documents Now →
        </a>
      </div>

      <p style="color: #6B7280; font-size: 13px; line-height: 1.6;">
        If you have questions, please reply directly to this email or visit BemsFarms operational hub.
      </p>
      ${footer}
    </div>`,
  });
}

async function sendDriverPasswordResetEmail(driver, resetToken) {
  const domain = process.env.FRONTEND_URL || "https://bemsfarms.com";
  const resetUrl = `${domain}/driver/reset-password?token=${encodeURIComponent(resetToken)}`;

  return sendMail({
    to: driver.email,
    subject: "🔐 Reset Your BemsFarms Driver Password",
    html: `<div style="${emailStyles}">
      ${header("Password Reset Request 🔐")}
      <p style="color: #4B5563; font-size: 15px; line-height: 1.6;">Hello <strong>${driver.name}</strong>,</p>
      <p style="color: #4B5563; font-size: 14px; line-height: 1.6;">
        A request has been made to reset the password for your <strong>BemsFarms Driver Courier Account</strong> (${driver.phone || driver.email}).
      </p>
      <div style="background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0;">
        <p style="font-size: 13px; color: #166534; font-weight: 700; margin: 0 0 10px; text-transform: uppercase;">Your Password Reset Token / Code:</p>
        <p style="font-size: 32px; font-weight: 900; color: #14532D; margin: 0; letter-spacing: 4px;">${resetToken}</p>
      </div>
      <div style="text-align: center; margin: 24px 0;">
        <a href="${resetUrl}" style="background: #143C2D; color: #ffffff; text-decoration: none; padding: 14px 28px; font-size: 14px; font-weight: 700; border-radius: 10px; display: inline-block; box-shadow: 0 4px 12px rgba(20,60,45,0.25);">
          Set New Password Securely →
        </a>
      </div>
      <p style="color: #9CA3AF; font-size: 12px; text-align: center;">
        This password reset link and code will expire in <strong>1 hour</strong>. If you did not request this, you can safely ignore this email.
      </p>
      ${footer}
    </div>`,
  });
}

async function sendAdminAlertEmail({ to, type, title, message, link, data = {} }) {
  const adminEmail = to || process.env.ADMIN_NOTIF_EMAIL || "info@bemsfarms.com";
  const domain = process.env.ADMIN_URL || "https://bemsfarms.com/admin";
  const fullLink = link ? (link.startsWith("http") ? link : `${domain}${link.startsWith("/") ? "" : "/"}${link}`) : domain;

  const typeLabels = {
    customer_register: "👤 New Customer Registered",
    order_placed:      "🛍️ New Online Order",
    pos_sale:          "💳 Point-of-Sale Sale",
    order_delivery:    "🛵 Delivery & Dispatch Update",
    support_message:   "💬 Live Support Message",
    ai_chat:           "🤖 Chef Bems AI Conversation",
    low_stock:         "⚠️ Low Stock Alert",
    batch_expiry:      "⏰ Batch Expiry Warning",
    refund_request:    "↩️ Refund / Return Request",
    system_error:      "🔴 System Error / Exception",
    security_event:    "🔑 Security & Password Change",
    staff_action:      "👥 Staff Management Action",
  };

  const badgeTitle = typeLabels[type] || title || "BemsFarms Notification";

  return sendMail({
    to: adminEmail,
    subject: `[BemsFarms Alert] ${title || badgeTitle}`,
    html: `<div style="${emailStyles}">
      ${header(title || badgeTitle)}
      <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-left: 4px solid #1B4332; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <p style="font-size: 15px; color: #1E293B; margin: 0; line-height: 1.6; font-weight: 500;">
          ${message}
        </p>
      </div>

      ${Object.keys(data).length > 0 ? `
      <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 8px; padding: 16px; margin: 20px 0; font-size: 13px;">
        <strong style="color: #475569; display: block; margin-bottom: 8px; text-transform: uppercase; font-size: 11px;">Event Details:</strong>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px; color: #334155;">
          ${Object.entries(data).map(([k, v]) => `
            <tr>
              <td style="padding: 4px 0; font-weight: 600; color: #64748B; text-transform: capitalize;">${k.replace(/_/g, " ")}:</td>
              <td style="padding: 4px 0; text-align: right; font-weight: 700; color: #0F172A;">${typeof v === "object" ? JSON.stringify(v) : String(v)}</td>
            </tr>
          `).join("")}
        </table>
      </div>` : ""}

      <div style="text-align: center; margin: 28px 0;">
        <a href="${fullLink}" style="background: #1B4332; color: #ffffff; padding: 14px 28px; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 14px; display: inline-block;">
          Open in Admin Dashboard →
        </a>
      </div>

      <p style="color: #94A3B8; font-size: 12px; text-align: center;">
        You received this email because notification preferences are enabled in BemsFarms System Settings.
      </p>
      ${footer}
    </div>`,
  });
}

async function sendDriverStatementEmail({
  email,
  name,
  driver,
  summary,
  transactions = [],
  statementRef,
  securityCode,
  verifyUrl,
  webPortalUrl,
  downloadUrl,
  htmlAttachment,
}) {
  const safeName = name || driver?.name || "Driver";
  const refCode = statementRef || `SOA-${driver?.wallet_account_number || "DRV"}-${new Date().getFullYear()}`;
  const periodText = summary?.period_label || `${summary?.start_date || "Inception"} – ${summary?.end_date || "Present"}`;
  const totalEarned = Number(summary?.total_earned ?? summary?.total_credits ?? 0).toLocaleString();
  const totalWithdrawn = Number(summary?.total_withdrawn ?? summary?.total_debits ?? 0).toLocaleString();
  const closingBalance = Number(summary?.closing_balance ?? summary?.available_balance ?? 0).toLocaleString();
  const deliveriesCount = summary?.total_deliveries ?? summary?.completed_deliveries ?? 0;

  const txRows = (transactions || []).slice(-10).map((tx) => {
    const isCr = tx.type === "credit";
    const amt = Number(tx.amount || 0).toLocaleString();
    const dateFormatted = tx.date
      ? new Date(tx.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
      : "—";
    return `
      <tr>
        <td style="padding: 10px 8px; border-bottom: 1px solid #E2E8F0; font-size: 12px; color: #475569;">${dateFormatted}</td>
        <td style="padding: 10px 8px; border-bottom: 1px solid #E2E8F0; font-size: 12px; color: #1E293B;">
          <strong>${tx.reference || "—"}</strong><br/>
          <span style="font-size: 11px; color: #64748B;">${tx.description || tx.category || "Commission Settlement"}</span>
        </td>
        <td style="padding: 10px 8px; border-bottom: 1px solid #E2E8F0; font-size: 12px; text-align: center;">
          <span style="padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 700; background: ${isCr ? "#DCFCE7; color: #15803D;" : "#FEE2E2; color: #B91C1C;"}">
            ${isCr ? "CREDIT" : "DEBIT"}
          </span>
        </td>
        <td style="padding: 10px 8px; border-bottom: 1px solid #E2E8F0; font-size: 13px; font-weight: 700; text-align: right; color: ${isCr ? "#15803D;" : "#B91C1C;"}">
          ${isCr ? "+" : "-"}₦${amt}
        </td>
      </tr>
    `;
  }).join("");

  const attachments = [];
  if (htmlAttachment) {
    const cleanDriverName = safeName.replace(/[/\\:*?"<>|]/g, " ").trim() || "Driver";
    attachments.push({
      filename: `${cleanDriverName} Commission Statement of Account - Bems Farms.html`,
      content: Buffer.from(htmlAttachment).toString("base64"),
    });
  }

  const emailHtml = `
    <div style="${emailStyles}">
      <div style="background: linear-gradient(135deg, #0F3622, #1B4332); padding: 32px 36px; border-radius: 16px 16px 0 0; text-align: center;">
        <span style="display: inline-block; background: rgba(255,255,255,0.15); color: #86EFAC; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 8px;">
          Official Logistics Settlement Record
        </span>
        <h1 style="color: white; margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.02em;">🌿 Bems Farms Global Ltd</h1>
        <p style="color: rgba(255,255,255,0.8); margin: 6px 0 0; font-size: 14px;">Driver Commission Statement of Account</p>
      </div>

      <div style="background: #F59E0B; height: 4px;"></div>

      <div style="padding: 28px 32px; background: #ffffff;">
        <div style="border-bottom: 1px solid #E2E8F0; padding-bottom: 16px; margin-bottom: 20px;">
          <h2 style="color: #0F3622; margin: 0 0 6px; font-size: 20px; font-weight: 800;">
            Statement for ${safeName}
          </h2>
          <p style="color: #64748B; margin: 0; font-size: 13px;">
            Statement Reference: <strong style="color: #0F3622; font-family: monospace;">${refCode}</strong> &bull; Period: <strong>${periodText}</strong>
          </p>
        </div>

        <p style="color: #334155; font-size: 14px; line-height: 1.6; margin: 0 0 20px;">
          Hello ${safeName},<br/>
          Here is your requested official <strong>Commission Statement of Account</strong> from Bems Farms Global Ltd Fleet & Logistics Operations.
        </p>

        <!-- Balance / Summary Card -->
        <div style="background: #0F3622; border-radius: 12px; padding: 22px; color: #ffffff; margin-bottom: 24px;">
          <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.12em; color: #86EFAC; font-weight: 700; margin-bottom: 4px;">
            Net Available / Closing Balance
          </div>
          <div style="font-size: 32px; font-weight: 800; color: #ffffff; letter-spacing: -0.03em; margin-bottom: 16px;">
            ₦${closingBalance}
          </div>
          <table style="width: 100%; border-top: 1px solid rgba(255,255,255,0.15); padding-top: 12px; font-size: 12px;">
            <tr>
              <td style="color: rgba(255,255,255,0.7); padding: 4px 0;">Total Earned (Gross):</td>
              <td style="text-align: right; font-weight: 700; color: #86EFAC;">+₦${totalEarned}</td>
            </tr>
            <tr>
              <td style="color: rgba(255,255,255,0.7); padding: 4px 0;">Total Disbursed (Withdrawals):</td>
              <td style="text-align: right; font-weight: 700; color: #FCA5A5;">-₦${totalWithdrawn}</td>
            </tr>
            <tr>
              <td style="color: rgba(255,255,255,0.7); padding: 4px 0;">Completed Deliveries:</td>
              <td style="text-align: right; font-weight: 700; color: #ffffff;">${deliveriesCount} drops</td>
            </tr>
          </table>
        </div>

        <!-- Recent Transactions -->
        ${transactions && transactions.length > 0 ? `
          <h3 style="color: #0F3622; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; margin: 0 0 10px;">
            Recent Statement Activity (${Math.min(transactions.length, 10)} entries)
          </h3>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
            <thead>
              <tr style="background: #F8FAFC; text-align: left; font-size: 11px; color: #64748B; text-transform: uppercase;">
                <th style="padding: 8px; border-bottom: 2px solid #E2E8F0;">Date</th>
                <th style="padding: 8px; border-bottom: 2px solid #E2E8F0;">Reference / Description</th>
                <th style="padding: 8px; border-bottom: 2px solid #E2E8F0; text-align: center;">Type</th>
                <th style="padding: 8px; border-bottom: 2px solid #E2E8F0; text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${txRows}
            </tbody>
          </table>
        ` : ""}

        <!-- Actions -->
        <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 18px; text-align: center; margin-bottom: 20px;">
          <p style="color: #475569; font-size: 13px; margin: 0 0 14px;">
            Your official audited A4 statement document is attached to this email. You can also view or verify it online anytime:
          </p>
          <div style="display: flex; justify-content: center; gap: 10px; flex-wrap: wrap;">
            ${downloadUrl ? `
              <a href="${downloadUrl}" style="background: #15803D; color: #ffffff; padding: 11px 20px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 13px; display: inline-block; margin: 4px;">
                📥 Download A4 Document
              </a>
            ` : ""}
            ${verifyUrl ? `
              <a href="${verifyUrl}" style="background: #0F3622; color: #ffffff; padding: 11px 20px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 13px; display: inline-block; margin: 4px;">
                🔍 Verify Authenticity Online
              </a>
            ` : ""}
          </div>
        </div>

        <p style="color: #94A3B8; font-size: 11px; line-height: 1.5; margin: 0; text-align: center;">
          Security Verification Hash: <code style="font-family: monospace; color: #0F3622;">${securityCode || "SEC-VERIFIED"}</code>
        </p>
      </div>

      <div style="background: #0F3622; padding: 20px 32px; border-radius: 0 0 16px 16px; text-align: center;">
        <p style="color: rgba(255,255,255,0.7); margin: 0; font-size: 12px;">
          &copy; 2026 Bems Farms Global Ltd &bull; Central Fleet Settlement Hub, Umuahia, Abia State<br/>
          <a href="mailto:corporate@bemsfarms.com" style="color: #86EFAC; text-decoration: none;">corporate@bemsfarms.com</a>
        </p>
      </div>
    </div>
  `;

  return sendMail({
    to: email,
    subject: `📄 ${safeName} Commission Statement of Account - Bems Farms`,
    html: emailHtml,
    attachments,
  });
}

module.exports = {
  sendMail,
  sendWelcomeEmail,
  sendOrderConfirmationEmail,
  sendOrderStatusEmail,
  sendSubscriptionWelcomeEmail,
  sendPasswordResetEmail,
  sendReferralUpgradeEmail,
  sendLowStockAlertEmail,
  sendStaffInvitationEmail,
  sendDriverInvitationEmail,
  sendDriverApprovedEmail,
  sendDriverRejectionEmail,
  sendDriverPasswordResetEmail,
  sendDriverStatementEmail,
  sendAdminAlertEmail,
};
