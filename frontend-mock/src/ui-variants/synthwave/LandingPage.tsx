import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const titleFont = "'Righteous', display";
const bodyFont = "'Exo 2', sans-serif";

const studios = [
    { name: "Writing", desc: "Retro-futuristic word processors" },
    { name: "Research", desc: "Data archives from the neon grids" },
    { name: "Image", desc: "Synthesizing visual reality" },
    { name: "Data", desc: "Tabular structures, glowing fast" },
    { name: "Finance", desc: "Trading on the mainframe" },
    { name: "Compare", desc: "Split-screen dual model overdrive" }
];

export default function SynthwaveLanding() {
    return (
        <div
            style={{
                minHeight: "100vh",
                background: "linear-gradient(to bottom, #120458 0%, #2A0845 50%, #FF007F 100%)",
                color: "#fff",
                fontFamily: bodyFont,
                position: "relative",
                overflowX: "hidden"
            }}
        >
            {/* Synthwave Grid */}
            <div style={{
                position: "fixed",
                bottom: 0,
                left: -1000,
                right: -1000,
                height: "50vh",
                background: "linear-gradient(transparent 65%, #00d2ff 100%), linear-gradient(90deg, transparent 65%, #00d2ff 100%)",
                backgroundSize: "60px 60px",
                transform: "perspective(400px) rotateX(70deg)",
                transformOrigin: "bottom",
                opacity: 0.6,
                pointerEvents: "none",
                zIndex: 0
            }} />

            <header style={{ padding: "1.5rem 3rem", display: "flex", justifyContent: "space-between", position: "relative", zIndex: 10 }}>
                <div style={{ fontFamily: titleFont, fontSize: "2.5rem", textShadow: "0 0 10px #00d2ff", letterSpacing: "2px" }}>BEYOND CHAT</div>
                <div style={{ display: "flex", gap: "2rem", alignItems: "center" }}>
                    <Link to="/synthwave/pricing" style={{ color: "#00d2ff", textDecoration: "none", fontFamily: titleFont, textShadow: "0 0 5px #00d2ff" }}>PRICING</Link>
                    <Link to="/synthwave/login" style={{ background: "#FF007F", color: "#fff", textDecoration: "none", fontFamily: titleFont, padding: "0.5rem 2rem", borderRadius: "30px", boxShadow: "0 0 15px #FF007F" }}>INSERT COIN</Link>
                </div>
            </header>

            <main style={{ position: "relative", zIndex: 10, padding: "5rem 3rem", textAlign: "center" }}>
                <motion.div
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 1 }}
                >
                    <h1 style={{
                        fontFamily: titleFont,
                        fontSize: "7rem",
                        margin: "0 0 1rem 0",
                        background: "linear-gradient(to bottom, #FFD700 0%, #FF8C00 100%)",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        filter: "drop-shadow(0 0 20px rgba(255, 0, 127, 0.8))"
                    }}>
                        VIRTUAL REALITY
                    </h1>
                    <p style={{ fontSize: "1.5rem", color: "#00d2ff", textShadow: "0 0 10px #00d2ff", margin: "0 auto 3rem", maxWidth: "600px", background: "rgba(0,0,0,0.5)", padding: "1rem", borderRadius: "10px" }}>
                        The chat thread is dead. Enter the glowing grid. Generate, save, and synthesize across 6 neon-lit studios.
                    </p>

                    <Link to="/synthwave/login" style={{
                        display: "inline-block",
                        background: "linear-gradient(90deg, #00d2ff, #FF007F)",
                        color: "#fff",
                        fontFamily: titleFont,
                        fontSize: "2rem",
                        padding: "1rem 4rem",
                        borderRadius: "50px",
                        textDecoration: "none",
                        boxShadow: "0 0 30px #FF007F",
                        textTransform: "uppercase"
                    }}>
                        JACK IN
                    </Link>
                </motion.div>

                <div style={{ marginTop: "8rem", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "2rem" }}>
                    {studios.map(s => (
                        <motion.div
                            key={s.name}
                            whileHover={{ scale: 1.05, boxShadow: "0 0 20px #00d2ff" }}
                            style={{
                                background: "rgba(18, 4, 88, 0.8)",
                                border: "2px solid #00d2ff",
                                borderRadius: "15px",
                                padding: "2rem",
                                boxShadow: "0 0 10px rgba(0, 210, 255, 0.5)",
                                backdropFilter: "blur(5px)"
                            }}
                        >
                            <h3 style={{ fontFamily: titleFont, fontSize: "2rem", color: "#FF007F", margin: "0 0 1rem 0", textShadow: "0 0 10px #FF007F" }}>{s.name}</h3>
                            <p style={{ fontSize: "1.1rem", margin: 0 }}>{s.desc}</p>
                        </motion.div>
                    ))}
                </div>
            </main>
        </div>
    );
}
