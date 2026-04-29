import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useState } from "react";

const serif = "'Cormorant Garamond', serif";
const body = "'Source Serif 4', serif";

export default function BroadsheetLogin() {
  const [isSignUp, setIsSignUp] = useState(false);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#FAF7F2",
        color: "#1a1a1a",
        fontFamily: body,
        display: "flex",
        position: "relative",
      }}
    >
      {/* Paper texture */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          opacity: 0.03,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Left — editorial decoration */}
      <div
        style={{
          display: "none",
          width: "45%",
          padding: "3rem",
          flexDirection: "column",
          justifyContent: "space-between",
          borderRight: "1px solid #e0dbd3",
          position: "relative",
          zIndex: 10,
        }}
        className="broadsheet-left-panel"
      >
        <div>
          <Link
            to="/broadsheet"
            style={{
              fontFamily: serif,
              fontSize: "1.8rem",
              fontWeight: 300,
              color: "#1a1a1a",
              textDecoration: "none",
            }}
          >
            Beyond Chat
          </Link>
        </div>
        <div>
          <div
            style={{
              height: "3px",
              background: "#C5303A",
              width: "40px",
              marginBottom: "2rem",
            }}
          />
          <blockquote
            style={{
              fontFamily: serif,
              fontSize: "2.5rem",
              fontWeight: 300,
              fontStyle: "italic",
              lineHeight: 1.2,
              marginBottom: "1.5rem",
            }}
          >
            &ldquo;The structured workspace that treats AI output as a
            first&#8209;class artifact.&rdquo;
          </blockquote>
          <p
            style={{
              fontFamily: body,
              fontSize: "0.9rem",
              color: "#888",
              lineHeight: 1.7,
              maxWidth: "380px",
            }}
          >
            Six studios. One artifact library. Multi-model comparison.
            Everything saved, searchable, and reusable.
          </p>
        </div>
        <p
          style={{
            fontFamily: body,
            fontSize: "0.7rem",
            color: "#bbb",
            fontStyle: "italic",
          }}
        >
          Est. 2025 &middot; A modular AI workspace
        </p>
      </div>

      {/* Right — form */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
          position: "relative",
          zIndex: 10,
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          style={{ width: "100%", maxWidth: "380px" }}
        >
          <div style={{ marginBottom: "2.5rem" }}>
            <Link
              to="/broadsheet"
              style={{
                fontFamily: serif,
                fontSize: "2rem",
                fontWeight: 300,
                color: "#1a1a1a",
                textDecoration: "none",
                display: "block",
                marginBottom: "2rem",
              }}
            >
              Beyond Chat
            </Link>
            <div
              style={{
                height: "1px",
                background: "#e0dbd3",
                marginBottom: "2rem",
              }}
            />
            <h1
              style={{
                fontFamily: serif,
                fontSize: "1.8rem",
                fontWeight: 400,
                marginBottom: "0.5rem",
              }}
            >
              {isSignUp ? "Create an account" : "Sign in"}
            </h1>
            <p
              style={{
                fontFamily: body,
                fontSize: "0.9rem",
                color: "#888",
                fontStyle: "italic",
              }}
            >
              {isSignUp
                ? "Your first workspace is free."
                : "Welcome back, reader."}
            </p>
          </div>

          {/* Social auth */}
          <div
            style={{ display: "flex", gap: "0.75rem", marginBottom: "1.5rem" }}
          >
            <button
              style={{
                flex: 1,
                padding: "0.75rem",
                background: "none",
                border: "1px solid #ddd",
                cursor: "pointer",
                fontFamily: body,
                fontSize: "0.8rem",
                color: "#555",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Google
            </button>
            <button
              style={{
                flex: 1,
                padding: "0.75rem",
                background: "none",
                border: "1px solid #ddd",
                cursor: "pointer",
                fontFamily: body,
                fontSize: "0.8rem",
                color: "#555",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
              }}
            >
              <svg width="16" height="16" fill="#333" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              GitHub
            </button>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "1rem",
              margin: "1.5rem 0",
            }}
          >
            <div style={{ flex: 1, height: "1px", background: "#e0dbd3" }} />
            <span
              style={{
                fontFamily: body,
                fontSize: "0.7rem",
                color: "#bbb",
                fontStyle: "italic",
              }}
            >
              or by email
            </span>
            <div style={{ flex: 1, height: "1px", background: "#e0dbd3" }} />
          </div>

          <form
            onSubmit={(e) => e.preventDefault()}
            style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
          >
            {isSignUp && (
              <div>
                <label
                  style={{
                    fontFamily: body,
                    fontSize: "0.75rem",
                    color: "#999",
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    display: "block",
                    marginBottom: "0.4rem",
                  }}
                >
                  Full name
                </label>
                <input
                  type="text"
                  placeholder="Jane Doe"
                  style={{
                    width: "100%",
                    padding: "0.75rem 0",
                    background: "none",
                    border: "none",
                    borderBottom: "1px solid #ddd",
                    fontFamily: body,
                    fontSize: "0.95rem",
                    color: "#1a1a1a",
                    outline: "none",
                  }}
                />
              </div>
            )}
            <div>
              <label
                style={{
                  fontFamily: body,
                  fontSize: "0.75rem",
                  color: "#999",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  display: "block",
                  marginBottom: "0.4rem",
                }}
              >
                Email address
              </label>
              <input
                type="email"
                placeholder="reader@example.com"
                style={{
                  width: "100%",
                  padding: "0.75rem 0",
                  background: "none",
                  border: "none",
                  borderBottom: "1px solid #ddd",
                  fontFamily: body,
                  fontSize: "0.95rem",
                  color: "#1a1a1a",
                  outline: "none",
                }}
              />
            </div>
            <div>
              <label
                style={{
                  fontFamily: body,
                  fontSize: "0.75rem",
                  color: "#999",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  display: "block",
                  marginBottom: "0.4rem",
                }}
              >
                Password
              </label>
              <input
                type="password"
                placeholder="••••••••"
                style={{
                  width: "100%",
                  padding: "0.75rem 0",
                  background: "none",
                  border: "none",
                  borderBottom: "1px solid #ddd",
                  fontFamily: body,
                  fontSize: "0.95rem",
                  color: "#1a1a1a",
                  outline: "none",
                }}
              />
            </div>

            {!isSignUp && (
              <div style={{ textAlign: "right" }}>
                <button
                  type="button"
                  style={{
                    background: "none",
                    border: "none",
                    fontFamily: body,
                    fontSize: "0.8rem",
                    color: "#C5303A",
                    cursor: "pointer",
                    fontStyle: "italic",
                  }}
                >
                  Forgot password?
                </button>
              </div>
            )}

            <button
              type="submit"
              style={{
                marginTop: "0.5rem",
                padding: "0.85rem",
                background: "#1a1a1a",
                color: "#FAF7F2",
                border: "none",
                fontFamily: body,
                fontSize: "0.9rem",
                fontWeight: 600,
                cursor: "pointer",
                letterSpacing: "0.02em",
              }}
            >
              {isSignUp ? "Create account" : "Sign in"} &rarr;
            </button>
          </form>

          <p
            style={{
              textAlign: "center",
              fontFamily: body,
              fontSize: "0.85rem",
              color: "#999",
              marginTop: "2rem",
            }}
          >
            {isSignUp ? "Already a reader?" : "New to Beyond Chat?"}{" "}
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              style={{
                background: "none",
                border: "none",
                fontFamily: body,
                fontSize: "0.85rem",
                color: "#C5303A",
                cursor: "pointer",
                textDecoration: "underline",
                textUnderlineOffset: "3px",
              }}
            >
              {isSignUp ? "Sign in" : "Create an account"}
            </button>
          </p>

          <div style={{ textAlign: "center", marginTop: "2.5rem" }}>
            <Link
              to="/"
              style={{
                fontFamily: body,
                fontSize: "0.7rem",
                color: "#ccc",
                textDecoration: "underline",
                textUnderlineOffset: "3px",
              }}
            >
              All editions
            </Link>
          </div>
        </motion.div>
      </div>

      {/* CSS for responsive left panel */}
      <style>{`
        @media (min-width: 900px) {
          .broadsheet-left-panel { display: flex !important; }
        }
      `}</style>
    </div>
  );
}
