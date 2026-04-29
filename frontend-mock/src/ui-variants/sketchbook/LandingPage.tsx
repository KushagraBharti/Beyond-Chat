import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const titleFont = "'Caveat', cursive";
const bodyFont = "'Patrick Hand', cursive";

const studios = [
    { name: "Scribbles (Writing)", desc: "Jot down ideas, scratch out the bad ones. Keep it messy till it's perfect." },
    { name: "Library (Research)", desc: "Dig through infinite stacks of papers to find that one golden fact." },
    { name: "Doodles (Image)", desc: "Draw outside the lines. Watch it come to life." },
    { name: "Ledgers (Data)", desc: "Rows and columns, but make it make sense." },
    { name: "Math (Finance)", desc: "Number crunching without the headache." },
    { name: "Versus (Compare)", desc: "Put 'em side by side and see who wins." }
];

export default function SketchbookLanding() {
    return (
        <div
            style={{
                minHeight: "100vh",
                background: "#F4F1EA",
                color: "#1A1A24",
                fontFamily: bodyFont,
                padding: "2rem",
                backgroundImage: "radial-gradient(#ccc 1px, transparent 1px)",
                backgroundSize: "20px 20px",
                overflowX: "hidden"
            }}
        >
            <nav style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4rem" }}>
                <div style={{ fontFamily: titleFont, fontSize: "2.5rem", fontWeight: "bold", transform: "rotate(-2deg)" }}>
                    Beyond Chat
                </div>
                <div style={{ display: "flex", gap: "2rem", fontSize: "1.2rem" }}>
                    <Link to="/sketchbook/pricing" style={{ color: "#1A1A24", textDecoration: "none", borderBottom: "2px dashed #1A1A24" }}>Plans</Link>
                    <Link to="/sketchbook/login" style={{ color: "#D13B3B", textDecoration: "none", transform: "rotate(3deg)", border: "2px solid #D13B3B", padding: "0.2rem 1rem", borderRadius: "10px 225px 15px 255px / 255px 15px 225px 15px" }}>Sign In</Link>
                </div>
            </nav>

            <main style={{ maxWidth: "1000px", margin: "0 auto" }}>
                <motion.section
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{ textAlign: "center", marginBottom: "5rem" }}
                >
                    <h1 style={{ fontFamily: titleFont, fontSize: "5rem", lineHeight: 1, margin: "0 0 1rem 0", color: "#1A1A24" }}>
                        A space for your <span style={{ color: "#D13B3B", position: "relative" }}>
                            messy thoughts.
                            <svg style={{ position: "absolute", bottom: -10, left: 0, width: "100%", height: "15px" }} viewBox="0 0 100 20" preserveAspectRatio="none">
                                <path d="M0 10 Q 50 20 100 5" stroke="#D13B3B" strokeWidth="3" fill="none" />
                            </svg>
                        </span>
                    </h1>
                    <p style={{ fontSize: "1.5rem", color: "#555", maxWidth: "600px", margin: "0 auto 2rem" }}>
                        Throw away the endless chat logs. Start saving everything you do in neat little notebooks.
                    </p>
                    <Link to="/sketchbook/login" style={{
                        display: "inline-block",
                        background: "#D13B3B",
                        color: "#fff",
                        fontSize: "1.5rem",
                        padding: "0.8rem 2rem",
                        textDecoration: "none",
                        borderRadius: "255px 15px 225px 15px/15px 225px 15px 255px",
                        border: "2px solid #1A1A24",
                        transform: "rotate(-1deg)",
                        boxShadow: "4px 4px 0 #1A1A24"
                    }}>Start scribbling!</Link>
                </motion.section>

                <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "2rem" }}>
                    {studios.map((s) => (
                        <motion.div
                            key={s.name}
                            initial={{ scale: 0.9, rotate: Math.random() * 4 - 2 }}
                            whileInView={{ scale: 1, rotate: Math.random() * 2 - 1 }}
                            viewport={{ once: true }}
                            transition={{ type: "spring", bounce: 0.5 }}
                            style={{
                                background: "#fff",
                                border: "2px solid #1A1A24",
                                borderRadius: "2px 255px 3px 25px / 255px 5px 225px 3px",
                                padding: "2rem",
                                boxShadow: "3px 3px 0 rgba(0,0,0,0.1)",
                                position: "relative"
                            }}
                        >
                            {/* Tape */}
                            <div style={{ position: "absolute", top: -10, left: "50%", transform: "translateX(-50%) rotate(-3deg)", width: "60px", height: "20px", background: "rgba(255,255,255,0.7)", border: "1px solid #ccc", boxShadow: "1px 1px 2px rgba(0,0,0,0.1)" }} />
                            <h3 style={{ fontFamily: titleFont, fontSize: "2rem", margin: "0 0 0.5rem 0", color: "#1A1A24" }}>{s.name}</h3>
                            <p style={{ fontSize: "1.2rem", color: "#555", margin: 0 }}>{s.desc}</p>
                        </motion.div>
                    ))}
                </section>
            </main>
        </div>
    );
}
