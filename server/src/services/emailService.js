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
        <div style="font-size: 12px; font-weight: 700; color: #4B5563; text-transform: uppercase; margin-bottom: 8px;">Your Driver Login Credentials:</div>
        <div style="font-size: 14px; color: #111827; margin-bottom: 4px;"><strong>Phone / Login ID:</strong> <span style="font-family: monospace; font-size: 15px;">${phone}</span></div>
        ${driverPin ? `<div style="font-size: 14px; color: #111827;"><strong>Driver App PIN:</strong> <span style="font-family: monospace; font-size: 16px; font-weight: 800; color: #1B4332;">${driverPin}</span></div>` : ""}
      </div>

      <div style="text-align: center; margin: 32px 0;">
        <a href="${loginUrl || "https://www.bemsfarms.com/driver"}" style="background: linear-gradient(135deg, #059669, #10B981); color: #ffffff; padding: 16px 36px;
          border-radius: 12px; text-decoration: none; font-weight: 800; font-size: 16px;
          display: inline-block; box-shadow: 0 4px 12px rgba(5, 150, 105, 0.25);">
          Launch Driver App &amp; Go Online →
        </a>
      </div>

      <p style="color: #6B7280; font-size: 13px; line-height: 1.6;">
        For any assistance, contact BemsFarms Dispatch Control via phone or your dispatch manager.
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
};


