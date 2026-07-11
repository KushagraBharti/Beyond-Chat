import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const titleFont = "'Caveat', cursive";
const bodyFont = "'Patrick Hand', cursive";

export default function SketchbookPricing() {
    return (
        <div
            style={{
                minHeight: "100vh",
                background: "#F4F1EA",
                color: "#1A1A24",
                fontFamily: bodyFont,
                padding: "4rem",
                display: "flex",
                flexDirection: "column",
                alignItems: "center"
            }}
        >
            <Link to="/sketchbook" style={{ alignSelf: "flex-start", fontSize: "1.5rem", color: "#1A1A24", textDecoration: "none", borderBottom: "2px dashed" }}>&lt; Go back</Link>

            <motion.div initial={{ rotate: -2 }} animate={{ rotate: 0 }} style={{ textAlign: "center", marginBottom: "4rem" }}>
                <h1 style={{ fontFamily: titleFont, fontSize: "4rem", margin: 0, color: "#1A1A24" }}>Pick your binder</h1>
            </motion.div>

            <div style={{ display: "flex", gap: "3rem", flexWrap: "wrap", justifyContent: "center" }}>

                {/* Free */}
                <motion.div
                    whileHover={{ scale: 1.05 }}
                    style={{
                        width: "300px",
                        background: "#fff",
                        border: "3px solid #1A1A24",
                        borderRadius: "15px 225px 15px 255px / 255px 15px 225px 15px",
                        padding: "2rem",
                        boxShadow: "8px 8px 0 #1A1A24",
                        transform: "rotate(-2deg)"
                    }}
                >
                    <h2 style={{ fontFamily: titleFont, fontSize: "3rem", margin: 0 }}>Little Book</h2>
                    <div style={{ fontSize: "2.5rem", margin: "1rem 0" }}>$0</div>
                    <ul style={{ listStyleType: "none", padding: 0, fontSize: "1.3rem", lineHeight: 1.8 }}>
                        <li>- Just the basics</li>
                        <li>- A few pages a day</li>
                        <li>- Still pretty good</li>
                    </ul>
                    <Link to="/sketchbook/login" style={{ display: "block", textAlign: "center", background: "#f0f0f0", color: "#1A1A24", border: "2px solid #1A1A24", padding: "0.5rem", borderRadius: "10px", textDecoration: "none", fontSize: "1.2rem", marginTop: "2rem" }}>Take this one</Link>
                </motion.div>

                {/* Pro */}
                <motion.div
                    whileHover={{ scale: 1.05 }}
                    style={{
                        width: "300px",
                        background: "#fff",
                        border: "3px solid #D13B3B",
                        borderRadius: "225px 15px 255px 15px / 15px 255px 15px 225px",
                        padding: "2rem",
                        boxShadow: "8px 8px 0 #D13B3B",
                        transform: "rotate(1deg)",
                        position: "relative"
                    }}
                >
                    <div style={{ position: "absolute", top: -20, right: -20, background: "#FFD700", border: "2px solid #1A1A24", padding: "0.5rem 1rem", borderRadius: "50%", transform: "rotate(15deg)", fontFamily: titleFont, fontSize: "1.5rem", fontWeight: "bold" }}>Best!</div>
                    <h2 style={{ fontFamily: titleFont, fontSize: "3rem", margin: 0, color: "#D13B3B" }}>Big Binder</h2>
                    <div style={{ fontSize: "2.5rem", margin: "1rem 0" }}>$20<span style={{ fontSize: "1.2rem" }}>/mo</span></div>
                    <ul style={{ listStyleType: "none", padding: 0, fontSize: "1.3rem", lineHeight: 1.8 }}>
                        <li>- ALL the tools</li>
                        <li>- Infinite pages</li>
                        <li>- Fancy comparison features</li>
                        <li>- Priority doodles</li>
                    </ul>
                    <Link to="/sketchbook/login" style={{ display: "block", textAlign: "center", background: "#D13B3B", color: "#fff", border: "2px solid #1A1A24", padding: "0.5rem", borderRadius: "10px", textDecoration: "none", fontSize: "1.2rem", marginTop: "2rem", boxShadow: "3px 3px 0 #1A1A24" }}>Give me this!</Link>
                </motion.div>

            </div>
        </div>
    );
}
