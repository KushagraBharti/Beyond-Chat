import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const titleFont = "'Righteous', display";
const bodyFont = "'Exo 2', sans-serif";

export default function SynthwavePricing() {
    return (
        <div
            style={{
                minHeight: "100vh",
                background: "radial-gradient(circle at center, #2A0845 0%, #120458 100%)",
                color: "#fff",
                fontFamily: bodyFont,
                padding: "4rem",
                display: "flex",
                flexDirection: "column",
                alignItems: "center"
            }}
        >
            <Link to="/synthwave" style={{ alignSelf: "flex-start", color: "#FF007F", textDecoration: "none", fontFamily: titleFont, fontSize: "1.2rem", textShadow: "0 0 5px #FF007F" }}>
                &lt;&lt; RETURN TO BASE
            </Link>

            <motion.h1 style={{ fontFamily: titleFont, fontSize: "5rem", margin: "2rem 0 4rem", color: "#00d2ff", textShadow: "0 0 20px rgba(0,210,255,0.8)" }}>
                UPGRADE CHIP
            </motion.h1>

            <div style={{ display: "flex", gap: "4rem", flexWrap: "wrap", justifyContent: "center" }}>

                {/* Lvl 1 */}
                <motion.div
                    whileHover={{ y: -10 }}
                    style={{
                        background: "rgba(0,0,0,0.6)",
                        border: "2px solid #00d2ff",
                        borderRadius: "20px",
                        padding: "3rem",
                        width: "350px",
                        textAlign: "center",
                        boxShadow: "0 0 20px rgba(0,210,255,0.4)"
                    }}
                >
                    <h2 style={{ fontFamily: titleFont, fontSize: "2.5rem", color: "#fff", margin: 0 }}>PLAYER 1</h2>
                    <div style={{ fontSize: "4rem", fontFamily: titleFont, color: "#00d2ff", margin: "1rem 0", textShadow: "0 0 10px #00d2ff" }}>$0</div>
                    <ul style={{ listStyle: "none", padding: 0, fontSize: "1.2rem", lineHeight: 2, marginBottom: "3rem", color: "#ccc" }}>
                        <li>Standard graphics</li>
                        <li>Limited credits</li>
                        <li>Single player mode</li>
                    </ul>
                    <Link to="/synthwave/login" style={{
                        display: "inline-block",
                        background: "transparent",
                        color: "#00d2ff",
                        border: "2px solid #00d2ff",
                        padding: "1rem 3rem",
                        borderRadius: "50px",
                        fontFamily: titleFont,
                        fontSize: "1.5rem",
                        textDecoration: "none"
                    }}>SELECT</Link>
                </motion.div>

                {/* Lvl 2 */}
                <motion.div
                    whileHover={{ y: -10 }}
                    style={{
                        background: "rgba(0,0,0,0.8)",
                        border: "3px solid #FF007F",
                        borderRadius: "20px",
                        padding: "3rem",
                        width: "350px",
                        textAlign: "center",
                        boxShadow: "0 0 30px rgba(255,0,127,0.6)",
                        position: "relative"
                    }}
                >
                    <div style={{ position: "absolute", top: -20, left: "50%", transform: "translateX(-50%)", background: "#FF007F", padding: "0.5rem 2rem", borderRadius: "20px", fontFamily: titleFont, letterSpacing: "2px", boxShadow: "0 0 10px #FF007F" }}>HIGH SCORE</div>
                    <h2 style={{ fontFamily: titleFont, fontSize: "2.5rem", color: "#fff", margin: 0 }}>TURBO</h2>
                    <div style={{ fontSize: "4rem", fontFamily: titleFont, color: "#FF007F", margin: "1rem 0", textShadow: "0 0 10px #FF007F" }}>$20</div>
                    <ul style={{ listStyle: "none", padding: 0, fontSize: "1.2rem", lineHeight: 2, marginBottom: "3rem", color: "#ccc" }}>
                        <li>Maximum overdrive</li>
                        <li>Unlimited credits</li>
                        <li>All models unlocked</li>
                        <li>Co-op mode ready</li>
                    </ul>
                    <Link to="/synthwave/login" style={{
                        display: "inline-block",
                        background: "#FF007F",
                        color: "#fff",
                        border: "none",
                        padding: "1rem 3rem",
                        borderRadius: "50px",
                        fontFamily: titleFont,
                        fontSize: "1.5rem",
                        textDecoration: "none",
                        boxShadow: "0 0 20px rgba(255,0,127,0.8)"
                    }}>OVERDRIVE</Link>
                </motion.div>

            </div>
        </div>
    );
}
