import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const titleFont = "'Righteous', display";
const bodyFont = "'Exo 2', sans-serif";

export default function SynthwaveLogin() {
    return (
        <div
            style={{
                height: "100vh",
                background: "linear-gradient(to top, #120458, #000)",
                color: "#fff",
                fontFamily: bodyFont,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
                overflow: "hidden"
            }}
        >
            <div style={{
                position: "absolute",
                top: 0,
                bottom: 0,
                left: 0,
                right: 0,
                background: "linear-gradient(rgba(255,0,127,0.1) 1px, transparent 1px)",
                backgroundSize: "100% 10px",
                pointerEvents: "none"
            }} />

            <Link to="/synthwave" style={{
                position: "absolute",
                top: "2rem",
                right: "2rem",
                color: "#00d2ff",
                textDecoration: "none",
                fontFamily: titleFont,
                fontSize: "1.5rem",
                textShadow: "0 0 10px #00d2ff"
            }}>EJECT</Link>

            <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                style={{
                    background: "rgba(0,0,0,0.8)",
                    border: "4px solid #FF007F",
                    borderRadius: "10px",
                    padding: "4rem",
                    width: "450px",
                    textAlign: "center",
                    boxShadow: "0 0 30px rgba(255,0,127,0.6)",
                    position: "relative"
                }}
            >
                <div style={{ position: "absolute", top: -25, left: "50%", transform: "translateX(-50%)", background: "#FF007F", color: "#fff", padding: "0.5rem 2rem", fontSize: "1.5rem", fontFamily: titleFont, boxShadow: "0 0 15px #FF007F", borderRadius: "30px" }}>LOGIN</div>

                <form style={{ display: "flex", flexDirection: "column", gap: "2rem", marginTop: "2rem" }}>
                    <div>
                        <label style={{ color: "#00d2ff", fontFamily: titleFont, display: "block", textAlign: "left", marginBottom: "0.5rem", textShadow: "0 0 5px #00d2ff" }}>PLAYER ID</label>
                        <input
                            type="text"
                            style={{
                                width: "100%",
                                background: "transparent",
                                border: "2px solid #00d2ff",
                                color: "#fff",
                                padding: "1rem",
                                fontSize: "1.2rem",
                                fontFamily: bodyFont,
                                outline: "none",
                                boxShadow: "inset 0 0 10px rgba(0,210,255,0.3)"
                            }}
                        />
                    </div>

                    <div>
                        <label style={{ color: "#FF007F", fontFamily: titleFont, display: "block", textAlign: "left", marginBottom: "0.5rem", textShadow: "0 0 5px #FF007F" }}>ACCESS CODE</label>
                        <input
                            type="password"
                            style={{
                                width: "100%",
                                background: "transparent",
                                border: "2px solid #FF007F",
                                color: "#fff",
                                padding: "1rem",
                                fontSize: "1.2rem",
                                fontFamily: bodyFont,
                                outline: "none",
                                boxShadow: "inset 0 0 10px rgba(255,0,127,0.3)"
                            }}
                        />
                    </div>

                    <button style={{
                        background: "linear-gradient(90deg, #FF007F, #00d2ff)",
                        border: "none",
                        color: "#fff",
                        padding: "1.5rem",
                        fontSize: "1.5rem",
                        fontFamily: titleFont,
                        marginTop: "1rem",
                        cursor: "pointer",
                        boxShadow: "0 0 20px rgba(255,255,255,0.4)"
                    }}>
                        START GAME
                    </button>
                </form>
            </motion.div>
        </div>
    );
}
