import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const titleFont = "'Anton', sans-serif";
const bodyFont = "'Oswald', sans-serif";

const studios = [
    { name: "WRITING", desc: "STRUCTURAL PROSE COMPOSITION. MAXIMAL EFFICIENCY." },
    { name: "RESEARCH", desc: "HEAVY DUTY DATA EXTRACTION DEPLOYED." },
    { name: "IMAGE", desc: "CONCRETE VISUAL GENERATION. INDUSTRIAL SCALE." },
    { name: "DATA", desc: "RAW TABULAR INGESTION. NO FRILLS." },
    { name: "FINANCE", desc: "NUMERICAL RIGOR. ZERO WASTE." },
    { name: "COMPARE", desc: "BRUTAL MODEL BENCHMARKING." }
];

export default function MonolithLanding() {
    return (
        <div
            style={{
                minHeight: "100vh",
                background: "#D3D3D3", // Concrete grey
                color: "#111",
                fontFamily: bodyFont,
                textTransform: "uppercase"
            }}
        >
            <header style={{ padding: "2rem 4rem", borderBottom: "10px solid #111", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                <div style={{ fontFamily: titleFont, fontSize: "4rem", lineHeight: 0.8 }}>BEYOND<br />CHAT</div>
                <div style={{ display: "flex", gap: "2rem", fontSize: "1.5rem", fontWeight: 700 }}>
                    <Link to="/monolith/pricing" style={{ color: "#111", textDecoration: "none" }}>TIERS</Link>
                    <Link to="/monolith/login" style={{ textDecoration: "none", background: "#111", color: "#D3D3D3", padding: "0.2rem 1rem" }}>AUTH</Link>
                </div>
            </header>

            <main>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
                    <div style={{ padding: "4rem", borderRight: "10px solid #111" }}>
                        <motion.h1
                            initial={{ y: 100, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            style={{ fontFamily: titleFont, fontSize: "7rem", lineHeight: 0.85, margin: "0 0 2rem 0" }}
                        >
                            STRUCTURE<br />IS<br />REQUIRED.
                        </motion.h1>
                        <p style={{ fontSize: "1.5rem", fontWeight: 500, lineHeight: 1.2, maxWidth: "600px", marginBottom: "3rem" }}>
                            THE CHAT PARADIGM IS WEAK.
                            <br /><br />
                            WE BUILD ARTIFACTS.
                            WE ORGANIZE DATA.
                            WE FORGE TOOLS.
                        </p>
                        <Link to="/monolith/login" style={{
                            display: "inline-block",
                            background: "#111",
                            color: "#D3D3D3",
                            fontFamily: titleFont,
                            fontSize: "3rem",
                            padding: "1rem 3rem",
                            textDecoration: "none",
                            border: "5px solid transparent",
                        }}
                            onMouseEnter={e => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.color = "#111"; e.currentTarget.style.borderColor = "#111"; }}
                            onMouseLeave={e => { e.currentTarget.style.background = "#111"; e.currentTarget.style.color = "#D3D3D3"; e.currentTarget.style.borderColor = "transparent"; }}
                        >
                            INITIALIZE
                        </Link>
                    </div>

                    <div style={{ background: "#222", color: "#D3D3D3", display: "flex", flexDirection: "column" }}>
                        {studios.map((s, i) => (
                            <div key={s.name} style={{ borderBottom: "5px solid #111", padding: "2rem 4rem", flexGrow: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                                    <h3 style={{ fontFamily: titleFont, fontSize: "3rem", margin: 0 }}>{s.name}</h3>
                                    <span style={{ fontSize: "2rem", fontWeight: 700, color: "#666" }}>0{i + 1}</span>
                                </div>
                                <p style={{ fontSize: "1.2rem", fontWeight: 500, margin: "0.5rem 0 0 0", color: "#888" }}>{s.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </main>
        </div>
    );
}
