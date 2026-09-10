import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import logo from "../assets/bemsfarms_logo_compact.png";

const POLICIES = {
  "/privacy": {
    eyebrow: "Your information",
    title: "Privacy Policy",
    summary: "How BemsFarms collects, uses, stores, and protects information when you shop or subscribe.",
    sections: [
      ["Information we collect", "We collect information you provide, including your name, email address, phone number, delivery address, account preferences, order details, support messages, and newsletter subscription. We also receive basic device and service logs needed to keep the platform secure and reliable."],
      ["How we use information", "We use this information to create and protect your account, process and deliver orders, verify payments, provide order updates and support, remember your preferences, prevent fraud, and send marketing updates when you subscribe."],
      ["Payments and service providers", "Payments are processed through secure licensed payment partners. Delivery, email, hosting, analytics, and infrastructure providers may process only the information needed to provide their services. BemsFarms does not sell your personal information."],
      ["Retention and security", "We retain records for as long as needed to provide the service, meet accounting and legal obligations, resolve disputes, and prevent abuse. We use access controls, encrypted connections, and authenticated account access, but no online service can guarantee absolute security."],
      ["Your choices", "You may update your profile and saved addresses, unsubscribe through a marketing email, or contact us to request access, correction, or deletion where applicable. Some transaction records must be retained for legal or operational reasons."],
    ],
  },
  "/terms": {
    eyebrow: "Shopping agreement",
    title: "Terms & Conditions",
    summary: "The terms that apply when you access BemsFarms, create an account, or place an order.",
    sections: [
      ["Accounts", "Provide accurate information and keep your login details secure. You are responsible for activity performed through your account. Contact support promptly if you suspect unauthorized access."],
      ["Products, stock, and pricing", "Products depend on availability. Images are illustrative and natural produce may vary in size, colour, and appearance. Prices, stock, taxes, and promotions may change before an order is confirmed. The checkout total shown before payment is the applicable total."],
      ["Orders and payment", "An order is accepted after required payment checks succeed and BemsFarms confirms it. We may contact you about substitutions, unavailable items, address problems, or suspected fraud. Eligible refunds are returned through the supported payment process."],
      ["Acceptable use", "Do not misuse the platform, attempt unauthorized access, interfere with service operation, submit fraudulent orders, or use automated systems in a way that harms customers or infrastructure."],
      ["Service changes", "We may improve, suspend, or discontinue features and update these terms. Material changes will be reflected by the date on this page. Continued use after an update means the revised terms apply."],
    ],
  },
  "/shipping": {
    eyebrow: "Getting your order",
    title: "Shipping & Delivery Policy",
    summary: "Delivery costs, address requirements, timing, tracking, and what happens when a delivery cannot be completed.",
    sections: [
      ["Standard delivery cost", "Standard delivery fees are calculated based on your destination and order requirements. Any applicable delivery options and their exact charges are displayed at checkout before payment."],
      ["Coverage and timing", "Availability depends on the delivery address, product handling needs, order time, and operational capacity. The options and estimate displayed during checkout are the applicable choices for that order; estimates are not guarantees."],
      ["Address and receiving", "Provide a complete address and reachable phone number. Ensure someone can receive and inspect the order. Extra cost caused by an incorrect address or repeated delivery attempt may require payment before redelivery."],
      ["Tracking and delays", "Use the delivery code in your order confirmation on the Track Order page. Weather, traffic, supply conditions, or other events outside reasonable control may cause delays. Contact support if tracking has not updated or an order is late."],
      ["Inspection", "Inspect delivered items promptly. Report missing, incorrect, damaged, or spoiled goods through your account or customer support as soon as reasonably possible and include supporting photographs where available."],
    ],
  },
  "/returns-policy": {
    eyebrow: "After delivery",
    title: "Returns & Refunds Policy",
    summary: "When an item can be returned, how to submit a request, and how eligible refunds are handled.",
    sections: [
      ["Return window", "Eligible items may be submitted for return within 7 days after delivery. The product-specific return policy and the condition of the delivered item determine eligibility."],
      ["Perishable goods", "Fresh, opened, used, contaminated, incorrectly stored, or rapidly perishable goods generally cannot be returned for a change of mind. Damaged, spoiled, missing, or incorrectly supplied goods should still be reported promptly for review."],
      ["How to request a return", "Sign in, open the relevant delivered order, and submit the return or issue request. Include the item, reason, quantity, and clear photographs when relevant. Keep the product and packaging until the review is complete."],
      ["Review and resolution", "BemsFarms may request additional information and may offer a replacement, refund, partial refund, or another appropriate resolution after review. Approved refunds are processed to the supported payment channel and may take 3–5 business days to appear."],
      ["Cancellations", "Orders may be cancelled before preparation or fulfilment reaches the stage shown as non-cancellable in your account. If payment was already completed, an eligible cancellation refund follows the normal processing timeframe."],
    ],
  },
};

export default function CommercePolicyPage() {
  const { pathname } = useLocation();
  const policy = POLICIES[pathname] || POLICIES["/terms"];

  useEffect(() => {
    document.title = `${policy.title} | BemsFarms`;
    const description = document.querySelector('meta[name="description"]');
    if (description) description.setAttribute("content", policy.summary);
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = `https://www.bemsfarms.com${pathname}`;
  }, [pathname, policy]);

  return (
    <div className="min-h-screen bg-[#F8F5EE] text-slate-900">
      <header className="border-b border-[#DFD6C2] bg-white/90 px-5 py-4 sm:px-8">
        <nav className="mx-auto flex max-w-5xl items-center justify-between" aria-label="Policy navigation">
          <Link to="/" aria-label="BemsFarms home"><img src={logo} alt="BemsFarms" className="h-10 w-auto" /></Link>
          <Link to="/contact" className="rounded-full border border-[#143c2d] px-5 py-2.5 text-sm font-bold text-[#143c2d]">Contact support</Link>
        </nav>
      </header>
      <main className="px-5 py-14 sm:px-8 sm:py-20">
        <article className="mx-auto max-w-3xl">
          <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#c85a17]">{policy.eyebrow}</p>
          <h1 className="mt-3 font-display text-4xl font-bold text-[#143c2d] sm:text-5xl">{policy.title}</h1>
          <p className="mt-5 text-lg leading-8 text-slate-600">{policy.summary}</p>
          <p className="mt-3 text-xs font-bold uppercase tracking-wider text-slate-500">Last updated 9 September 2026</p>
          <div className="mt-12 space-y-10">
            {policy.sections.map(([heading, body]) => <section key={heading}><h2 className="font-display text-2xl font-bold text-[#143c2d]">{heading}</h2><p className="mt-3 leading-7 text-slate-600">{body}</p></section>)}
          </div>
          <aside className="mt-12 rounded-3xl bg-[#143c2d] p-7 text-white"><h2 className="font-display text-2xl font-bold">Questions about this policy?</h2><p className="mt-2 text-sm leading-6 text-emerald-100">Contact BemsFarms at <a className="font-bold text-amber-300 underline" href="mailto:info@bemsfarms.com">info@bemsfarms.com</a>.</p></aside>
          <nav aria-label="Other policies" className="mt-10 flex flex-wrap gap-4 text-sm font-bold text-[#143c2d]"><Link to="/terms">Terms</Link><Link to="/privacy">Privacy</Link><Link to="/shipping">Shipping</Link><Link to="/returns-policy">Returns</Link><Link to="/">Back to shop</Link></nav>
        </article>
      </main>
    </div>
  );
}
