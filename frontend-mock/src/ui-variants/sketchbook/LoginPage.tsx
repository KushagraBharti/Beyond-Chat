import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const titleFont = "'Caveat', cursive";
const bodyFont = "'Patrick Hand', cursive";

export default function SketchbookLogin() {
    return (
        <div
            style={{
                height: "100vh",
                background: "#F4F1EA",
                color: "#1A1A24",
                fontFamily: bodyFont,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundImage: "repeating-linear-gradient(transparent, transparent 31px, rgba(0,0,255,0.1) 31px, rgba(0,0,255,0.1) 32px)",
                backgroundPosition: "0 0",
                position: "relative"
            }}
        >
            <div style={{ position: "absolute", left: "40px", top: "0", bottom: "0", width: "2px", background: "rgba(255,0,0,0.3)" }} />

            <Link to="/sketchbook" style={{ position: "absolute", top: "2rem", right: "2rem", fontSize: "1.5rem", color: "#D13B3B", textDecoration: "none" }}>
                x Close book
            </Link>

            <motion.div
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                style={{
                    width: "100%",
                    maxWidth: "400px",
                    textAlign: "center"
                }}
            >
                <h1 style={{ fontFamily: titleFont, fontSize: "4rem", margin: "0 0 2rem 0", transform: "rotate(-2deg)" }}>Sign In</h1>

                <form style={{ display: "flex", flexDirection: "column", gap: "2rem" }} onSubmit={(e) => e.preventDefault()}>
                    <div style={{ position: "relative" }}>
                        <label style={{ position: "absolute", top: "-25px", left: "10px", fontSize: "1.2rem", transform: "rotate(2deg)" }}>Your Name (Email)</label>
                        <input
                            type="text"
                            style={{
                                width: "100%",
                                background: "transparent",
                                border: "none",
                                borderBottom: "2px solid #1A1A24",
                                fontFamily: bodyFont,
                                fontSize: "1.5rem",
                                padding: "0.5rem",
                                outline: "none"
                            }}
                        />
                    </div>

                    <div style={{ position: "relative" }}>
                        <label style={{ position: "absolute", top: "-25px", left: "10px", fontSize: "1.2rem", transform: "rotate(-1deg)" }}>Super Secret Code</label>
                        <input
                            type="password"
                            style={{
                                width: "100%",
                                background: "transparent",
                                border: "none",
                                borderBottom: "2px solid #1A1A24",
                                fontFamily: bodyFont,
                                fontSize: "1.5rem",
                                padding: "0.5rem",
                                outline: "none"
                            }}
                        />
                    </div>

                    <button style={{
                        marginTop: "1rem",
                        background: "#fff",
                        color: "#1A1A24",
                        border: "2px solid #1A1A24",
                        borderRadius: "255px 15px 225px 15px/15px 225px 15px 255px",
                        padding: "1rem",
                        fontFamily: titleFont,
                        fontSize: "2rem",
                        cursor: "pointer",
                        transform: "rotate(1deg)",
                        boxShadow: "3px 3px 0 #1A1A24",
                        transition: "transform 0.1s"
                    }}
                        onMouseDown={e => e.currentTarget.style.transform = "rotate(1deg) translate(2px, 2px)"}
                        onMouseUp={e => e.currentTarget.style.transform = "rotate(1deg)"}
                    >
                        Let me in!
                    </button>
                </form>
            </motion.div>
        </div>
    );
}
