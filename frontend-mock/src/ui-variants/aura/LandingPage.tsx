import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const titleFont = "'Cinzel', serif";
const bodyFont = "'Sora', sans-serif";

const studios = [
  { name: "Writing", desc: "Compose with fluid, unhindered clarity." },
  { name: "Research", desc: "Gather deep insights from an ocean of knowledge." },
  { name: "Image", desc: "Manifest visual visions from abstract thoughts." },
  { name: "Data", desc: "Distill pure meaning from chaotic data streams." },
  { name: "Finance", desc: "Navigate complex markets with serene foresight." },
  { name: "Compare", desc: "View multiple realities side by side." }
];

export default function AuraLanding() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0a0a0c",
        overflow: "hidden",
        position: "relative",
        fontFamily: bodyFont,
        color: "#f0f0f5",
      }}
    >
      {/* Dynamic Aura Background */}
      <motion.div
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position: "absolute",
          top: "10%",
          left: "20%",
          width: "60vw",
          height: "60vw",
          background: "radial-gradient(circle, rgba(162,155,254,0.15) 0%, transparent 60%)",
          filter: "blur(60px)",
          borderRadius: "50%",
          zIndex: 0,
        }}
      />
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.2, 0.4, 0.2],
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        style={{
          position: "absolute",
          bottom: "-10%",
          right: "10%",
          width: "50vw",
          height: "50vw",
          background: "radial-gradient(circle, rgba(129,236,236,0.1) 0%, transparent 70%)",
          filter: "blur(80px)",
          borderRadius: "50%",
          zIndex: 0,
        }}
      />

      {/* Navigation */}
      <nav
        style={{
          position: "relative",
          zIndex: 10,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "2rem 4rem",
        }}
      >
        <div style={{ fontFamily: titleFont, fontSize: "1.5rem", letterSpacing: "0.1em", fontWeight: 500 }}>
          BEYOND
        </div>
        <div style={{ display: "flex", gap: "2rem", alignItems: "center" }}>
          <Link to="/aura/pricing" style={{ color: "#a0a0ab", textDecoration: "none", fontSize: "0.9rem", transition: "color 0.3s" }} onMouseEnter={e => e.currentTarget.style.color = "#fff"} onMouseLeave={e => e.currentTarget.style.color = "#a0a0ab"}>
            Pricing
          </Link>
          <Link to="/aura/login" style={{ 
            color: "#fff", 
            textDecoration: "none", 
            fontSize: "0.9rem",
            padding: "0.6rem 1.5rem",
            background: "rgba(255, 255, 255, 0.05)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            borderRadius: "30px",
            backdropFilter: "blur(10px)",
            transition: "all 0.3s"
          }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; e.currentTarget.style.transform = "translateY(-2px)" }}
          onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.transform = "translateY(0)" }}
          >
            Portal Access
          </Link>
        </div>
      </nav>

      <main style={{ position: "relative", zIndex: 10, padding: "6rem 4rem" }}>
        {/* Hero */}
        <div style={{ textAlign: "center", maxWidth: "800px", margin: "0 auto" }}>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            style={{
              fontFamily: titleFont,
              fontSize: "clamp(3rem, 6vw, 5rem)",
              fontWeight: 400,
              lineHeight: 1.1,
              marginBottom: "1.5rem",
              background: "linear-gradient(to right, #fff, #a0a0ab)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Clarity Through Structure
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.5, delay: 0.4 }}
            style={{
              fontSize: "1.1rem",
              lineHeight: 1.6,
              color: "#a0a0ab",
              maxWidth: "600px",
              margin: "0 auto 3rem",
              fontWeight: 300
            }}
          >
            A crystalline environment for your most profound thoughts. 
            Escape the chaotic thread; enter a boundless gallery of artifacts.
          </motion.p>
          
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.8 }}
          >
            <Link to="/aura/login" style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "1rem 2.5rem",
              fontSize: "1rem",
              color: "#fff",
              textDecoration: "none",
              background: "linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.0) 100%)",
              border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: "50px",
              backdropFilter: "blur(20px)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
              transition: "transform 0.3s, box-shadow 0.3s"
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.05)"; e.currentTarget.style.boxShadow = "0 12px 40px rgba(162,155,254,0.2)" }}
            onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "0 8px 32px rgba(0,0,0,0.3)" }}
            >
              Step Beyond
            </Link>
          </motion.div>
        </div>

        {/* Studio Grid */}
        <div style={{ marginTop: "8rem", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "2rem", maxWidth: "1200px", margin: "8rem auto 0" }}>
          {studios.map((s, i) => (
            <motion.div
              key={s.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.8, delay: i * 0.1 }}
              style={{
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.05)",
                padding: "2.5rem",
                borderRadius: "24px",
                backdropFilter: "blur(12px)",
                transition: "all 0.4s ease",
                cursor: "default"
              }}
              onMouseEnter={e => { 
                e.currentTarget.style.background = "rgba(255,255,255,0.05)"; 
                e.currentTarget.style.borderColor = "rgba(162,155,254,0.3)";
                e.currentTarget.style.transform = "translateY(-5px)";
              }}
              onMouseLeave={e => { 
                e.currentTarget.style.background = "rgba(255,255,255,0.02)"; 
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.05)";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              <h3 style={{ fontFamily: titleFont, fontSize: "1.5rem", marginBottom: "1rem", color: "#e0e0e6" }}>{s.name}</h3>
              <p style={{ color: "#a0a0ab", fontSize: "0.95rem", lineHeight: 1.6, fontWeight: 300 }}>{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </main>
    </div>
  );
}
