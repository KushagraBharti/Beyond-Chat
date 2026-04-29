import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const titleFont = "'Anton', sans-serif";
const bodyFont = "'Oswald', sans-serif";

export default function MonolithPricing() {
    return (
        <div
            style={{
                minHeight: "100vh",
                background: "#111",
                color: "#D3D3D3",
                fontFamily: bodyFont,
                textTransform: "uppercase",
                display: "flex",
                flexDirection: "column"
            }}
        >
            <header style={{ padding: "2rem", borderBottom: "5px solid #333" }}>
                <Link to="/monolith" style={{ color: "#D3D3D3", textDecoration: "none", fontSize: "1.5rem", fontWeight: 700, fontFamily: titleFont }}>&lt; ABORT</Link>
            </header>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", flexGrow: 1 }}>
                <div style={{ padding: "4rem", display: "flex", alignItems: "center" }}>
                    <h1 style={{ fontFamily: titleFont, fontSize: "6rem", lineHeight: 0.9, margin: 0 }}>CHOOSE<br />YOUR<br />CAPACITY</h1>
                </div>

                {/* Base */}
                <motion.div
                    whileHover={{ background: "#222" }}
                    style={{ borderLeft: "5px solid #333", padding: "4rem", display: "flex", flexDirection: "column" }}
                >
                    <h2 style={{ fontFamily: titleFont, fontSize: "4rem", margin: 0, color: "#888" }}>BASE</h2>
                    <div style={{ fontSize: "5rem", fontWeight: 700, fontFamily: titleFont, margin: "1rem 0 2rem 0" }}>$0</div>
                    <ul style={{ listStyle: "none", padding: 0, fontSize: "1.2rem", fontWeight: 500, color: "#888", display: "flex", flexDirection: "column", gap: "1rem", flexGrow: 1 }}>
                        <li>LTD ARTIFACT STORAGE</li>
                        <li>REDUCED INFERENCE SPEED</li>
                        <li>CORE STUDIOS ONLY</li>
                    </ul>
                    <Link to="/monolith/login" style={{ width: "100%", background: "#D3D3D3", color: "#111", textAlign: "center", padding: "1.5rem", fontSize: "2rem", fontFamily: titleFont, textDecoration: "none" }}>SELECT BASE</Link>
                </motion.div>

                {/* Heavy */}
                <motion.div
                    whileHover={{ background: "#eee", color: "#111" }}
                    style={{ background: "#D3D3D3", color: "#111", borderLeft: "5px solid #111", padding: "4rem", display: "flex", flexDirection: "column", transition: "background 0.3s, color 0.3s" }}
                >
                    <h2 style={{ fontFamily: titleFont, fontSize: "4rem", margin: 0 }}>HEAVY</h2>
                    <div style={{ fontSize: "5rem", fontWeight: 700, fontFamily: titleFont, margin: "1rem 0 2rem 0" }}>$20</div>
                    <ul style={{ listStyle: "none", padding: 0, fontSize: "1.2rem", fontWeight: 700, display: "flex", flexDirection: "column", gap: "1rem", flexGrow: 1 }}>
                        <li>UNLIMITED STORAGE</li>
                        <li>MAXIMUM INFERENCE SPEED</li>
                        <li>ALL STUDIOS DEPLOYED</li>
                        <li>PARALLEL COMPUTE ON</li>
                    </ul>
                    <Link to="/monolith/login" style={{ width: "100%", background: "#111", color: "#D3D3D3", textAlign: "center", padding: "1.5rem", fontSize: "2rem", fontFamily: titleFont, textDecoration: "none" }}>SELECT HEAVY</Link>
                </motion.div>

            </div>
        </div>
    );
}
