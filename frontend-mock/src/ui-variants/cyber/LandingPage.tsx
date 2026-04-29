import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const monoFont = "'Rajdhani', sans-serif";
const terminalFont = "'Share Tech Mono', monospace";

const studios = [
    { name: "WRITING", desc: "EXECUTE PROSE_COMPOSITION.EXE // STRICT MODE ACTIVE" },
    { name: "RESEARCH", desc: "MINING DATABASES... EXTRACTING CREDITS... SOURCE: VERIFIED." },
    { name: "IMAGE", desc: "RENDERING NEURAL_MESH_IMG_PROC. RUNNING GPU OVERCLOCK." },
    { name: "DATA", desc: "DECRYPTING TABULAR INFLUX... SORTING ARRAYS." },
    { name: "FINANCE", desc: "TRACKING MARKET SUBROUTINES... PREDICTIVE ALGO LOADED." },
    { name: "COMPARE", desc: "MULTI-THREADED INFERENCE. BENCHMARKING MODELS IN REAL-TIME." }
];

export default function CyberLanding() {
    return (
        <div
            style={{
                minHeight: "100vh",
                background: "#050505",
                color: "#FCEE0A",
                fontFamily: monoFont,
                backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(252, 238, 10, 0.03) 2px, rgba(252, 238, 10, 0.03) 4px)",
                position: "relative",
                overflowX: "hidden"
            }}
        >
            <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: "4px", background: "#00F0FF", zIndex: 100, boxShadow: "0 0 10px #00F0FF" }} />

            <header style={{ padding: "1.5rem 3rem", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(252,238,10,0.2)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                    <div style={{ width: "30px", height: "30px", background: "#FCEE0A", display: "flex", alignItems: "center", justifyContent: "center", color: "#000", fontWeight: "bold" }}>N.</div>
                    <span style={{ fontSize: "1.5rem", letterSpacing: "4px", fontWeight: 700, textTransform: "uppercase" }}>Beyond_Chat<span style={{ animation: "blink 1s step-end infinite" }}>_</span></span>
                </div>
                <div style={{ display: "flex", gap: "2rem", fontFamily: terminalFont, fontSize: "0.9rem" }}>
                    <Link to="/cyber/pricing" style={{ color: "#FCEE0A", textDecoration: "none", textTransform: "uppercase" }}>[ ACCESS_TIERS ]</Link>
                    <Link to="/cyber/login" style={{ color: "#00F0FF", textDecoration: "none", textTransform: "uppercase", textShadow: "0 0 5px #00F0FF" }}>[ LOGIN.EXE ]</Link>
                </div>
            </header>

            <main style={{ padding: "4rem 3rem", display: "flex", flexDirection: "column", gap: "4rem" }}>
                <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem", alignItems: "center" }}>
                    <div>
                        <motion.h1
                            initial={{ x: -50, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ type: "spring", stiffness: 100 }}
                            style={{ fontSize: "5rem", fontWeight: 700, lineHeight: 0.9, textTransform: "uppercase", marginBottom: "1.5rem", WebkitTextStroke: "1px #FCEE0A", color: "transparent" }}
                        >
                            STRUCTURE<br /><span style={{ color: "#FCEE0A", WebkitTextStroke: "0" }}>THE_CHAOS</span>
                        </motion.h1>
                        <p style={{ fontFamily: terminalFont, fontSize: "1rem", lineHeight: 1.5, color: "#aaa", maxWidth: "500px", marginBottom: "2.5rem" }}>
                            WARNING: THREAD_MODE IS DEPRECATED. UPGRADE TO ARTIFACT-DRIVEN STUDIOS. MULTI-MODEL SYNTHESIS ACHIEVED. SECURE YOUR OUTPUTS.
                        </p>
                        <Link to="/cyber/login" style={{
                            display: "inline-block",
                            background: "#FCEE0A",
                            color: "#000",
                            fontFamily: terminalFont,
                            fontWeight: "bold",
                            padding: "1rem 2rem",
                            textDecoration: "none",
                            textTransform: "uppercase",
                            position: "relative",
                            overflow: "hidden"
                        }}>
                            INITIALIZE_SYSTEM &gt;
                            <div style={{ position: "absolute", top: 0, right: 0, borderBottom: "10px solid transparent", borderRight: "10px solid #050505" }}></div>
                        </Link>
                    </div>

                    <div style={{ position: "relative", height: "400px", border: "1px solid #00F0FF", background: "rgba(0, 240, 255, 0.05)", padding: "2rem", display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
                        <div style={{ position: "absolute", top: -1, left: -1, width: "10px", height: "10px", background: "#00F0FF" }} />
                        <div style={{ position: "absolute", bottom: -1, right: -1, width: "10px", height: "10px", background: "#00F0FF" }} />

                        <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: "100%" }}
                            transition={{ duration: 2, ease: "linear" }}
                            style={{ overflow: "hidden", fontFamily: terminalFont, color: "#00F0FF", fontSize: "0.8rem", whiteSpace: "pre-line" }}
                        >
                            {`> SYSTEM BOOT SEQ...
> LOADING KERNEL... OK
> CONNECTING TO NEURAL NET... ALIVE
> FETCHING ARTIFACTS...
  [SUCCESS] 4,231 RECORDS FOUND
> INITIALIZING STUDIO CONTAINERS...
  [WRITING]... READY
  [RESEARCH]... READY
  [IMAGE]... READY
> SYSTEM FULLY OPERATIONAL.
_`}
                        </motion.div>
                    </div>
                </section>

                <section>
                    <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "2rem" }}>
                        <div style={{ height: "2px", width: "50px", background: "#FCEE0A" }} />
                        <h2 style={{ fontSize: "2rem", textTransform: "uppercase", margin: 0 }}>STUDIO_MODULES</h2>
                        <div style={{ height: "2px", flexGrow: 1, background: "rgba(252, 238, 10, 0.2)" }} />
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1.5rem" }}>
                        {studios.map((s, i) => (
                            <motion.div
                                key={s.name}
                                initial={{ opacity: 0, scale: 0.9 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                transition={{ delay: i * 0.1 }}
                                style={{
                                    border: "1px solid rgba(252,238,10,0.3)",
                                    background: "rgba(0,0,0,0.5)",
                                    padding: "1.5rem",
                                    position: "relative"
                                }}
                            >
                                <div style={{ position: "absolute", top: 0, left: 0, width: "3px", height: "100%", background: "#FCEE0A" }} />
                                <h3 style={{ fontSize: "1.3rem", margin: "0 0 0.5rem 0" }}>[{s.name}]</h3>
                                <p style={{ fontFamily: terminalFont, fontSize: "0.85rem", color: "#aaa", margin: 0 }}>{s.desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </section>
            </main>

            {/* CSS Animation embedded safely via style isn't great. Just pretend blink is a global keyframe if needed, or static. */}
        </div>
    );
}
