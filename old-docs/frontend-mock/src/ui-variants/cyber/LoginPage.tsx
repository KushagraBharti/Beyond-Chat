import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const monoFont = "'Rajdhani', sans-serif";
const terminalFont = "'Share Tech Mono', monospace";

export default function CyberLogin() {
    return (
        <div
            style={{
                height: "100vh",
                background: "#000",
                color: "#FCEE0A",
                fontFamily: monoFont,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "column",
                position: "relative",
            }}
        >
            <Link to="/cyber" style={{ position: "absolute", top: "2rem", left: "2rem", fontFamily: terminalFont, color: "#00F0FF", textDecoration: "none" }}>
                [ TERMINATE_CONN ]
            </Link>

            <motion.div
                initial={{ opacity: 0, scale: 1.1 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{
                    width: "400px",
                    border: "2px solid #FCEE0A",
                    background: "#050505",
                    padding: "2rem",
                    position: "relative"
                }}
            >
                <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "4px", background: "repeating-linear-gradient(90deg, #FCEE0A, #FCEE0A 10px, transparent 10px, transparent 20px)" }} />

                <h1 style={{ fontSize: "2rem", textTransform: "uppercase", marginBottom: "0.5rem" }}>AUTH_GATEWAY</h1>
                <p style={{ fontFamily: terminalFont, color: "#00F0FF", fontSize: "0.85rem", marginBottom: "2rem" }}>BIOMETRIC SCAN OFFLINE. USE CREDENTIALS.</p>

                <form style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }} onSubmit={(e) => e.preventDefault()}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                        <label style={{ fontFamily: terminalFont, fontSize: "0.8rem", color: "#aaa" }}>HANDLE / EMAIL</label>
                        <input
                            type="text"
                            style={{
                                background: "transparent",
                                border: "1px solid #333",
                                borderBottom: "2px solid #00F0FF",
                                padding: "0.8rem",
                                color: "#fff",
                                fontFamily: terminalFont,
                                outline: "none"
                            }}
                        />
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                        <label style={{ fontFamily: terminalFont, fontSize: "0.8rem", color: "#aaa" }}>CIPHER / PASS</label>
                        <input
                            type="password"
                            style={{
                                background: "transparent",
                                border: "1px solid #333",
                                borderBottom: "2px solid #FF0055",
                                padding: "0.8rem",
                                color: "#fff",
                                fontFamily: terminalFont,
                                outline: "none"
                            }}
                        />
                    </div>

                    <button style={{
                        marginTop: "1rem",
                        background: "#FCEE0A",
                        color: "#000",
                        border: "none",
                        padding: "1rem",
                        fontFamily: terminalFont,
                        fontWeight: "bold",
                        fontSize: "1rem",
                        textTransform: "uppercase",
                        cursor: "pointer",
                        position: "relative"
                    }}>
                        ACCESS_DATABASE
                        <div style={{ position: "absolute", bottom: 0, right: 0, borderTop: "10px solid transparent", borderRight: "10px solid #050505" }}></div>
                    </button>
                </form>

            </motion.div>
        </div>
    );
}
