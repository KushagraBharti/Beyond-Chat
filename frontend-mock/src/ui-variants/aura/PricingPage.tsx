import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const titleFont = "'Cinzel', serif";
const bodyFont = "'Sora', sans-serif";

export default function AuraPricing() {
    return (
        <div
            style={{
                minHeight: "100vh",
                background: "#0a0a0c",
                overflow: "hidden",
                position: "relative",
                fontFamily: bodyFont,
                color: "#f0f0f5",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                padding: "4rem 2rem",
            }}
        >
            {/* Background glow */}
            <motion.div
                animate={{ opacity: [0.1, 0.2, 0.1], scale: [1, 1.2, 1] }}
                transition={{ duration: 10, repeat: Infinity }}
                style={{
                    position: "absolute",
                    top: "20%",
                    width: "80vw",
                    height: "80vw",
                    background: "radial-gradient(circle, rgba(232,67,147,0.1) 0%, transparent 50%)",
                    filter: "blur(100px)",
                    zIndex: 0,
                }}
            />

            <Link to="/aura" style={{ position: "absolute", top: "2rem", left: "2rem", color: "#a0a0ab", textDecoration: "none", zIndex: 10, display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span>&larr;</span> Return
            </Link>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1 }}
                style={{ textAlign: "center", zIndex: 10, marginBottom: "4rem" }}
            >
                <h1 style={{ fontFamily: titleFont, fontSize: "3rem", fontWeight: 400, marginBottom: "1rem" }}>Avenues of Access</h1>
                <p style={{ color: "#a0a0ab", fontWeight: 300 }}>Select the vessel for your exploration.</p>
            </motion.div>

            <div style={{ display: "flex", gap: "2rem", flexWrap: "wrap", justifyContent: "center", zIndex: 10, width: "100%", maxWidth: "1000px" }}>
                {/* Tier 1 */}
                <motion.div
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    style={{
                        flex: "1 1 300px",
                        background: "rgba(255,255,255,0.03)",
                        backdropFilter: "blur(20px)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        borderRadius: "30px",
                        padding: "3rem",
                        display: "flex",
                        flexDirection: "column",
                    }}
                >
                    <h2 style={{ fontFamily: titleFont, fontSize: "1.5rem", color: "#a0a0ab" }}>Novitiate</h2>
                    <div style={{ margin: "2rem 0", fontSize: "2.5rem", fontWeight: 300 }}>Free</div>
                    <ul style={{ listStyle: "none", padding: 0, margin: "0 0 3rem 0", color: "#a0a0ab", fontWeight: 300, display: "flex", flexDirection: "column", gap: "1rem" }}>
                        <li>&bull; 3 Studio uses per day</li>
                        <li>&bull; Basic artifact retention</li>
                        <li>&bull; Standard intelligence</li>
                    </ul>
                    <Link to="/aura/login" style={{
                        marginTop: "auto",
                        textAlign: "center",
                        padding: "1rem",
                        background: "rgba(255,255,255,0.05)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: "50px",
                        color: "#fff",
                        textDecoration: "none",
                        transition: "all 0.3s"
                    }}
                        onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
                        onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
                    >Begin Journey</Link>
                </motion.div>

                {/* Tier 2 */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.4 }}
                    style={{
                        flex: "1 1 300px",
                        transform: "scale(1.05)",
                        background: "linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)",
                        backdropFilter: "blur(30px)",
                        border: "1px solid rgba(162,155,254,0.4)",
                        borderRadius: "30px",
                        padding: "3rem",
                        display: "flex",
                        flexDirection: "column",
                        boxShadow: "0 20px 50px rgba(0,0,0,0.5), inset 0 0 20px rgba(162,155,254,0.1)",
                        position: "relative"
                    }}
                >
                    <div style={{ position: "absolute", top: "-15px", left: "50%", transform: "translateX(-50%)", background: "linear-gradient(90deg, #A29BFE, #81ECEC)", padding: "0.2rem 1rem", borderRadius: "20px", fontSize: "0.75rem", fontWeight: 600, color: "#000", letterSpacing: "0.1em" }}>LUMINOUS</div>
                    <h2 style={{ fontFamily: titleFont, fontSize: "1.5rem", color: "#fff" }}>Adept</h2>
                    <div style={{ margin: "2rem 0", fontSize: "2.5rem", fontWeight: 300 }}>$20<span style={{ fontSize: "1rem", color: "#a0a0ab" }}>/mo</span></div>
                    <ul style={{ listStyle: "none", padding: 0, margin: "0 0 3rem 0", color: "#e0e0e6", fontWeight: 300, display: "flex", flexDirection: "column", gap: "1rem" }}>
                        <li>&bull; Unlimited Studio access</li>
                        <li>&bull; Eternal artifact vault</li>
                        <li>&bull; Deep multi-model comparison</li>
                        <li>&bull; Enhanced reasoning depth</li>
                    </ul>
                    <Link to="/aura/login" style={{
                        marginTop: "auto",
                        textAlign: "center",
                        padding: "1rem",
                        background: "linear-gradient(90deg, rgba(162,155,254,0.8), rgba(129,236,236,0.8))",
                        border: "none",
                        borderRadius: "50px",
                        color: "#000",
                        fontWeight: 500,
                        textDecoration: "none",
                        boxShadow: "0 4px 15px rgba(162,155,254,0.4)"
                    }}>Embrace Infinity</Link>
                </motion.div>
            </div>
        </div>
    );
}
