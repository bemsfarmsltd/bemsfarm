import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageWrapper from "../components/layout/PageWrapper";
import api from "../services/api";
import { useCart } from "../context/CartContext";

export default function PaymentRecoveryPage() {
  const navigate = useNavigate();
  const { clearCart } = useCart();
  const [intent, setIntent] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    let cancelled = false;
    try {
      const saved = JSON.parse(localStorage.getItem("bems_pending_checkout") || "null");
      if (!saved?.intentId) throw new Error("No pending checkout was found on this device.");
      api.get(`/orders/checkout-intent/${encodeURIComponent(saved.intentId)}`)
        .then((response) => { if (!cancelled) setIntent(response.data.intent); })
        .catch((err) => { if (!cancelled) setError(err.response?.data?.message || err.message); })
        .finally(() => { if (!cancelled) setLoading(false); });
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
    return () => { cancelled = true; };
  }, []);

  const retry = async () => {
    setRetrying(true);
    setError(null);
    try {
      const response = await api.post("/orders", {
        items: intent.items,
        payment_method: "monnify",
        payment_ref: intent.payment_ref,
        checkout_intent_id: intent.id,
        address: intent.address,
      });
      clearCart();
      localStorage.removeItem("bems_pending_checkout");
      localStorage.removeItem("bems_pending_payment_ref");
      navigate("/order-confirmed", { state: { orderId: response.data.orderId, reference: intent.payment_ref } });
    } catch (err) {
      setError(err.response?.data?.message || "Payment is not yet confirmed. Please try again shortly or contact support with the reference.");
    } finally {
      setRetrying(false);
    }
  };

  return (
    <PageWrapper>
      <main style={{ maxWidth: 560, margin: "80px auto", padding: "0 20px", textAlign: "center" }}>
        <h1 style={{ color: "#1B4332", fontFamily: "var(--heading-font)" }}>Recover your payment</h1>
        {loading && <p>Checking your pending checkout...</p>}
        {!loading && intent && (
          <>
            <p>Your payment reference is <strong>{intent.payment_ref}</strong>.</p>
            <p>Total: <strong>₦{Number(intent.total).toLocaleString()}</strong></p>
            <button type="button" onClick={retry} disabled={retrying} style={{ padding: "12px 22px", border: 0, borderRadius: 8, background: "#1B4332", color: "#fff", cursor: "pointer" }}>
              {retrying ? "Checking payment..." : "Retry order confirmation"}
            </button>
          </>
        )}
        {error && <p role="alert" style={{ color: "#B91C1C", marginTop: 20 }}>{error}</p>}
        <button type="button" onClick={() => navigate("/orders")} style={{ marginTop: 24, border: 0, background: "transparent", color: "#1B4332", cursor: "pointer" }}>
          View my orders
        </button>
      </main>
    </PageWrapper>
  );
}