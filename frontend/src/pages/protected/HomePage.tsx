import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext";

const heading = "'Bricolage Grotesque', sans-serif";
const body = "'Plus Jakarta Sans', sans-serif";

const c = {
  canvas: "#F2F2F0",
  surface: "#FFFFFF",
  ink: "#0D0D0D",
  primary: "#4F3FE8",
  muted: "#6B6B70",
  border: "#E2E2E0",
};

export default function HomePage() {
  const { user } = useAuth();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: body,
        background: c.canvas,
      }}
    >
      <div
        style={{
          background: c.surface,
          borderRadius: "16px",
          padding: "3rem",
          maxWidth: "480px",
          width: "100%",
          textAlign: "center",
          boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
          border: `1px solid ${c.border}`,
        }}
      >
        <h1
          style={{
            fontFamily: heading,
            fontSize: "2rem",
            fontWeight: 800,
            letterSpacing: "-0.03em",
            color: c.ink,
            marginBottom: "0.5rem",
          }}
        >
          Welcome back
        </h1>
        <p style={{ color: c.muted, fontSize: "0.95rem", marginBottom: "2rem" }}>
          {user?.email}
        </p>
        <button
          onClick={handleSignOut}
          style={{
            padding: "0.85rem 2rem",
            borderRadius: "10px",
            background: c.ink,
            color: "#fff",
            fontFamily: body,
            fontSize: "0.95rem",
            fontWeight: 700,
            border: "none",
            cursor: "pointer",
            transition: "all 0.2s",
            boxShadow: "0 4px 14px rgba(0,0,0,0.1)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-2px)";
            e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,0,0,0.15)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 4px 14px rgba(0,0,0,0.1)";
          }}
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}
