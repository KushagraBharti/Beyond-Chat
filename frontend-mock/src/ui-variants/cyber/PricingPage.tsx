import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const monoFont = "'Rajdhani', sans-serif";
const terminalFont = "'Share Tech Mono', monospace";

export default function CyberPricing() {
    return (
        <div
            style={{
                minHeight: "100vh",
                background: "#050505",
                color: "#FCEE0A",
                fontFamily: monoFont,
                padding: "4rem",
                backgroundImage: "linear-gradient(rgba(0, 240, 255, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 240, 255, 0.05) 1px, transparent 1px)",
                backgroundSize: "40px 40px"
            }}
        >
            <Link to="/cyber" style={{ fontFamily: terminalFont, color: "#00F0FF", textDecoration: "none", marginBottom: "3rem", display: "inline-block" }}>
                &lt; SYSTEM.RETURN()
            </Link>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ marginBottom: "3rem" }}>
                <h1 style={{ fontSize: "3.5rem", textTransform: "uppercase", margin: 0, textShadow: "2px 2px #FF0055" }}>ACCESS_REQ</h1>
                <p style={{ fontFamily: terminalFont, color: "#aaa" }}>CHOOSE YOUR BANDWIDTH LEVEL DOWNLINK.</p>
            </motion.div>

            <div style={{ display: "flex", gap: "2rem", flexWrap: "wrap" }}>

                {/* Basic Tier */}
                <motion.div
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    style={{
                        flex: "1 1 350px",
                        border: "2px solid #FCEE0A",
                        padding: "2rem",
                        background: "#000",
                        position: "relative"
                    }}
                >
                    <div style={{ fontFamily: terminalFont, color: "#00F0FF", marginBottom: "1rem" }}>// LEVEL 01</div>
                    <h2 style={{ fontSize: "2rem", margin: "0 0 1rem 0" }}>GHOST</h2>
                    <div style={{ fontSize: "3rem", fontWeight: "bold", fontFamily: terminalFont }}>$0<span style={{ fontSize: "1rem", color: "#aaa" }}>/CYC</span></div>
                    <ul style={{ listStyle: "none", padding: 0, fontFamily: terminalFont, color: "#ccc", margin: "2rem 0", display: "flex", flexDirection: "column", gap: "1rem" }}>
                        <li>[+] STANDARD CPU CYCLES</li>
                        <li>[+] 10 ARTIFACT SLOTS</li>
                        <li>[-] NO MULTI-THREADING</li>
                    </ul>
                    <Link to="/cyber/login" style={{
                        display: "block",
                        textAlign: "center",
                        background: "transparent",
                        color: "#FCEE0A",
                        border: "1px solid #FCEE0A",
                        padding: "1rem",
                        textDecoration: "none",
                        fontFamily: terminalFont,
                        fontWeight: "bold"
                    }}>ACTIVATE</Link>
                </motion.div>

                {/* Pro Tier */}
                <motion.div
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    style={{
                        flex: "1 1 350px",
                        border: "2px solid #FF0055",
                        padding: "2rem",
                        background: "rgba(255, 0, 85, 0.05)",
                        position: "relative",
                        boxShadow: "0 0 20px rgba(255, 0, 85, 0.2)"
                    }}
                >
                    <div style={{ position: "absolute", top: -15, right: 20, background: "#FF0055", color: "#fff", padding: "0.2rem 1rem", fontFamily: terminalFont, fontWeight: "bold" }}>OVERCLOCKED</div>
                    <div style={{ fontFamily: terminalFont, color: "#FF0055", marginBottom: "1rem" }}>// LEVEL 02 MAXIMUM</div>
                    <h2 style={{ fontSize: "2rem", margin: "0 0 1rem 0", color: "#fff" }}>NETRUNNER</h2>
                    <div style={{ fontSize: "3rem", fontWeight: "bold", fontFamily: terminalFont, color: "#fff" }}>$20<span style={{ fontSize: "1rem", color: "#aaa" }}>/CYC</span></div>
                    <ul style={{ listStyle: "none", padding: 0, fontFamily: terminalFont, color: "#ccc", margin: "2rem 0", display: "flex", flexDirection: "column", gap: "1rem" }}>
                        <li>[+] MAX GPU PROCESSING</li>
                        <li>[+] UNLIMITED ARTIFACT VAULT</li>
                        <li>[+] ALL STUDIOS UNLOCKED</li>
                        <li>[+] PARALLEL MODEL INFERENCE</li>
                    </ul>
                    <Link to="/cyber/login" style={{
                        display: "block",
                        textAlign: "center",
                        background: "#FF0055",
                        color: "#fff",
                        border: "none",
                        padding: "1rem",
                        textDecoration: "none",
                        fontFamily: terminalFont,
                        fontWeight: "bold",
                        textTransform: "uppercase"
                    }}>Engage Protocol</Link>
                </motion.div>
            </div>
        </div>
    );
}
