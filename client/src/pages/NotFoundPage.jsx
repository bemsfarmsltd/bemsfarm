import { Link } from "react-router-dom";
import PageWrapper from "../components/layout/PageWrapper";

export default function NotFoundPage() {
  return (
    <PageWrapper>
      <div
        style={{
          minHeight: "60vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: "60px 24px",
        }}
      >
        <div style={{ fontSize: 72, fontWeight: 800, color: "#2E7D32", lineHeight: 1 }}>404</div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#111827", margin: "16px 0 8px" }}>
          Page not found
        </h1>
        <p style={{ fontSize: 14, color: "#6B7280", margin: "0 0 28px", maxWidth: 380 }}>
          The page you're looking for doesn't exist or may have moved.
        </p>
        <Link
          to="/home"
          style={{
            padding: "12px 28px",
            borderRadius: 12,
            background: "#2E7D32",
            color: "#fff",
            fontWeight: 700,
            fontSize: 14,
            textDecoration: "none",
          }}
        >
          Back to Home
        </Link>
      </div>
    </PageWrapper>
  );
}