import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const titleFont = "'Cinzel', serif";
const bodyFont = "'Sora', sans-serif";

export default function AuraLogin() {
    return (
        <div
            style={{
                height: "100vh",
                background: "#0a0a0c",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: bodyFont,
                position: "relative",
                overflow: "hidden"
            }}
        >
            {/* Mystical Portal Glow */}
            <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
                style={{
                    position: "absolute",
                    width: "60vw",
                    height: "60vw",
                    background: "conic-gradient(from 0deg, transparent 0%, rgba(162,155,254,0.2) 25%, transparent 50%, rgba(129,236,236,0.2) 75%, transparent 100%)",
                    filter: "blur(60px)",
                    borderRadius: "50%",
                    zIndex: 0
                }}
            />
            <div style={{ position: "absolute", zIndex: 0, width: "100%", height: "100%", background: "radial-gradient(circle, transparent 20%, #0a0a0c 70%)" }} />

            <Link to="/aura" style={{ position: "absolute", top: "2rem", left: "2rem", color: "#a0a0ab", textDecoration: "none", zIndex: 10, display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span>&larr;</span> Return
            </Link>

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1 }}
                style={{
                    background: "rgba(255,255,255,0.03)",
                    backdropFilter: "blur(40px)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "40px",
                    padding: "4rem",
                    width: "100%",
                    maxWidth: "450px",
                    zIndex: 10,
                    boxShadow: "0 25px 50px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(255,255,255,0.05)"
                }}
            >
                <div style={{ textAlign: "center", marginBottom: "3rem" }}>
                    <h1 style={{ fontFamily: titleFont, fontSize: "2rem", color: "#fff", fontWeight: 400, marginBottom: "0.5rem" }}>Enter the Portal</h1>
                    <p style={{ color: "#a0a0ab", fontSize: "0.9rem", fontWeight: 300 }}>Identify yourself to proceed.</p>
                </div>

                <form style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }} onSubmit={(e) => e.preventDefault()}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                        <label style={{ color: "#a0a0ab", fontSize: "0.8rem", paddingLeft: "1rem" }}>Essence Signature (Email)</label>
                        <input
                            type="email"
                            placeholder="user@domain.com"
                            style={{
                                background: "rgba(0,0,0,0.3)",
                                border: "1px solid rgba(255,255,255,0.1)",
                                padding: "1rem 1.5rem",
                                borderRadius: "20px",
                                color: "#fff",
                                fontFamily: bodyFont,
                                outline: "none",
                                transition: "border-color 0.3s"
                            }}
                            onFocus={e => e.currentTarget.style.borderColor = "rgba(162,155,254,0.5)"}
                            onBlur={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"}
                        />
                    </div>

                    <button style={{
                        marginTop: "1rem",
                        padding: "1rem",
                        background: "linear-gradient(135deg, rgba(255,255,255,0.9), rgba(255,255,255,0.6))",
                        border: "none",
                        borderRadius: "20px",
                        fontFamily: bodyFont,
                        fontWeight: 500,
                        color: "#0a0a0c",
                        cursor: "pointer",
                        transition: "transform 0.2s, background 0.3s"
                    }}
                        onMouseEnter={e => e.currentTarget.style.transform = "scale(1.02)"}
                        onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
                    >
                        Materialize
                    </button>
                </form>

                <div style={{ textAlign: "center", marginTop: "2rem", fontSize: "0.85rem", color: "#a0a0ab" }}>
                    No signature yet? <a href="#" style={{ color: "#fff" }}>Forge one</a>.
                </div>
            </motion.div>
        </div>
    );
}
