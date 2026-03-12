/* eslint-disable react-hooks/rules-of-hooks */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useRef, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useScroll, useTransform, useMotionValue, AnimatePresence } from "framer-motion";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Float, MeshTransmissionMaterial, Environment, Sphere, Box, Octahedron } from "@react-three/drei";
import * as THREE from "three";

// --- THEME & STYLES ---
const heading = "'Bricolage Grotesque', sans-serif";
const body = "'Plus Jakarta Sans', sans-serif";

const c = {
  canvas: "#F2F2F0",
  surface: "#FFFFFF",
  ink: "#0D0D0D",
  primary: "#4F3FE8",
  accent: "#E55613",
  muted: "#6B6B70",
  border: "#E2E2E0",
  subtle: "#EAEAE8",
  data: "#30A46C",
  compare: "#8B5CF6",
};

const studioColors = {
  writing: "#4F3FE8",
  research: "#0E7AE6",
  image: "#E5484D",
  data: "#30A46C",
  finance: "#E55613",
  compare: "#8B5CF6",
};

const studios = [
  { name: "Writing Studio", desc: "Draft with constraints, refine with AI, export polished documents.", color: studioColors.writing, span: "wide" },
  { name: "Research Studio", desc: "Multi-step investigations that produce organized, citation-rich reports.", color: studioColors.research, span: "col" },
  { name: "Image Studio", desc: "Visual prompt engineering with variant grids and iterative refinement.", color: studioColors.image, span: "col" },
  { name: "Data Studio", desc: "Upload tables, apply transformations, and surface statistical insights.", color: studioColors.data, span: "col" },
  { name: "Finance Studio", desc: "Autonomous agent research with transparent step-by-step reasoning.", color: studioColors.finance, span: "col" },
  { name: "Model Compare", desc: "Same prompt. GPT-4, Claude, Gemini side-by-side.", color: studioColors.compare, span: "wide" },
];

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const fadeUp: any = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: "easeOut" } },
};

// --- GLOBAL COMPONENTS ---
const NoiseOverlay = () => (
  <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 9999, opacity: 0.35, mixBlendMode: "overlay" }}>
    <svg width="100%" height="100%">
      <filter id="noiseFilter">
        <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="3" stitchTiles="stitch" />
      </filter>
      <rect width="100%" height="100%" filter="url(#noiseFilter)" />
    </svg>
  </div>
);

const CustomCursor = ({ variant }: { variant: "default" | "play" | "rotate" }) => {
  const mouseX = useMotionValue(-100);
  const mouseY = useMotionValue(-100);

  useEffect(() => {
    const moveCursor = (e: MouseEvent) => {
      mouseX.set(e.clientX - 16);
      mouseY.set(e.clientY - 16);
    };
    window.addEventListener("mousemove", moveCursor);
    return () => window.removeEventListener("mousemove", moveCursor);
  }, [mouseX, mouseY]);

  let content = null;
  let size = 32;
  let bg = "rgba(79, 63, 232, 0.5)"; 
  
  if (variant === "play") {
    size = 48;
    bg = c.primary;
    content = <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>;
  } else if (variant === "rotate") {
    size = 48;
    bg = c.accent;
    content = <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/></svg>;
  }

  return (
    <motion.div
      style={{
        position: "fixed",
        top: 0, left: 0,
        pointerEvents: "none",
        zIndex: 10000,
        x: mouseX, y: mouseY,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      <motion.div
        animate={{ 
          width: size, 
          height: size, 
          backgroundColor: bg,
          x: -(size - 32)/2,
          y: -(size - 32)/2
        }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        style={{
          borderRadius: "50%",
          display: "flex", alignItems: "center", justifyContent: "center",
          backdropFilter: variant === "default" ? "blur(4px)" : "none",
          mixBlendMode: variant === "default" ? "difference" : "normal"
        }}
      >
        <AnimatePresence mode="wait">
          {content && (
            <motion.div initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0 }} style={{ display: "flex" }}>
              {content}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
};

// --- INTERACTIVE MOCKUPS ---

const UIFrame = ({ children, isHovered }: any) => (
  <motion.div 
    style={{ marginTop: "1.5rem", background: c.surface, borderRadius: "16px", border: `1px solid ${c.border}`, height: "140px", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: isHovered ? "0 10px 30px rgba(0,0,0,0.08)" : "0 4px 12px rgba(0,0,0,0.02)", transition: "all 0.4s ease", position: "relative" }}
  >
    <div style={{ display: "flex", gap: "0.4rem", padding: "0.6rem 0.75rem", borderBottom: `1px solid ${c.border}`, background: c.canvas }}>
      <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#E2E2E0" }} />
      <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#E2E2E0" }} />
      <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#E2E2E0" }} />
    </div>
    <div style={{ flex: 1, position: "relative", display: "flex", background: c.surface, overflow: "hidden" }}>
      {children}
    </div>
  </motion.div>
);

const WritingStudioMockup = ({ isHovered }: { isHovered: boolean }) => (
  <UIFrame isHovered={isHovered}>
    <div style={{ width: "30%", borderRight: `1px solid ${c.border}`, padding: "0.75rem", display: "flex", flexDirection: "column", gap: "0.5rem", background: "#fafafa" }}>
      <div style={{ height: "4px", width: "40%", background: c.border, borderRadius: "2px" }} />
      <div style={{ height: "4px", width: "80%", background: c.border, borderRadius: "2px" }} />
      <div style={{ height: "4px", width: "60%", background: c.border, borderRadius: "2px" }} />
      <motion.div animate={{ opacity: isHovered ? [0.3, 1, 0.3] : 0.3 }} transition={{ duration: 1.5, repeat: Infinity }} style={{ marginTop: "auto", height: "16px", background: `${c.primary}15`, borderRadius: "4px", border: `1px solid ${c.primary}30` }} />
    </div>
    <div style={{ flex: 1, padding: "1rem", position: "relative" }}>
      <h4 style={{ fontFamily: heading, fontSize: "0.75rem", marginBottom: "0.5rem", color: c.ink }}>Executive Summary</h4>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
        <div style={{ height: "6px", background: c.subtle, borderRadius: "3px", overflow: "hidden" }}>
          <motion.div initial={{ width: "0%" }} animate={{ width: isHovered ? "100%" : "0%" }} transition={{ duration: 1, ease: "linear" }} style={{ height: "100%", background: c.muted }} />
        </div>
        <div style={{ height: "6px", background: c.subtle, borderRadius: "3px", overflow: "hidden" }}>
          <motion.div initial={{ width: "0%" }} animate={{ width: isHovered ? "90%" : "0%" }} transition={{ duration: 1, delay: 0.8, ease: "linear" }} style={{ height: "100%", background: c.muted }} />
        </div>
        <div style={{ height: "6px", background: c.subtle, borderRadius: "3px", overflow: "hidden", width: "70%" }}>
          <motion.div initial={{ width: "0%" }} animate={{ width: isHovered ? "100%" : "0%" }} transition={{ duration: 0.8, delay: 1.6, ease: "linear" }} style={{ height: "100%", background: c.muted }} />
        </div>
      </div>
      <AnimatePresence>
        {isHovered && (
          <motion.div 
            initial={{ opacity: 0, y: 10, scale: 0.9 }} 
            animate={{ opacity: 1, y: 0, scale: 1 }} 
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ delay: 1.2, type: "spring" }}
            style={{ position: "absolute", bottom: "1rem", right: "1rem", background: c.surface, padding: "0.4rem 0.6rem", borderRadius: "6px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", border: `1px solid ${c.primary}40`, display: "flex", alignItems: "center", gap: "0.4rem" }}
          >
            <div style={{ width: "8px", height: "8px", background: c.primary, borderRadius: "50%" }} />
            <span style={{ fontSize: "0.55rem", fontWeight: 700 }}>AI Suggestion</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  </UIFrame>
);

const ResearchStudioMockup = ({ isHovered }: { isHovered: boolean }) => (
  <UIFrame isHovered={isHovered}>
    <div style={{ flex: 1, display: "flex", padding: "0.75rem", gap: "0.75rem" }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.4rem" }}>
        <div style={{ fontSize: "0.5rem", color: c.muted, fontWeight: 700, textTransform: "uppercase" }}>Sources</div>
        {[0, 1].map((i) => (
          <motion.div key={i} animate={{ borderColor: isHovered && i === 0 ? studioColors.research : c.border }} style={{ padding: "0.4rem", border: `1px solid ${c.border}`, borderRadius: "6px", display: "flex", alignItems: "center", gap: "0.4rem", background: c.canvas }}>
            <div style={{ width: "12px", height: "12px", background: "#e0e0e0", borderRadius: "2px" }} />
            <div style={{ height: "3px", width: "40px", background: c.muted, borderRadius: "2px" }} />
          </motion.div>
        ))}
      </div>
      <div style={{ flex: 1.5, background: c.canvas, borderRadius: "6px", border: `1px dashed ${c.border}`, padding: "0.5rem", position: "relative" }}>
        <div style={{ fontSize: "0.5rem", color: c.muted, fontWeight: 700, textTransform: "uppercase", marginBottom: "0.4rem" }}>Knowledge Graph</div>
        <AnimatePresence>
          {isHovered && (
            <motion.div style={{ position: "absolute", inset: "1rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} style={{ background: c.surface, padding: "0.4rem", borderRadius: "4px", borderLeft: `2px solid ${studioColors.research}`, fontSize: "0.5rem", boxShadow: "0 2px 5px rgba(0,0,0,0.05)" }}>
                Extracted: Key methodology...
              </motion.div>
              <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6 }} style={{ background: c.surface, padding: "0.4rem", borderRadius: "4px", borderLeft: `2px solid ${studioColors.research}`, fontSize: "0.5rem", boxShadow: "0 2px 5px rgba(0,0,0,0.05)", marginLeft: "10px" }}>
                Connecting to finding B...
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  </UIFrame>
);

const ImageStudioMockup = ({ isHovered }: { isHovered: boolean }) => (
  <UIFrame isHovered={isHovered}>
    <div style={{ width: "30px", borderRight: `1px solid ${c.border}`, padding: "0.5rem", display: "flex", flexDirection: "column", gap: "0.4rem", alignItems: "center", background: "#fafafa" }}>
      {[0, 1, 2, 3].map(i => (
        <div key={i} style={{ width: "16px", height: "16px", borderRadius: "4px", background: i === 1 && isHovered ? studioColors.image : c.border, transition: "background 0.3s" }} />
      ))}
    </div>
    <div style={{ flex: 1, padding: "0.75rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
      {[0, 1, 2, 3].map(i => (
        <motion.div key={i} style={{ borderRadius: "6px", background: c.canvas, overflow: "hidden", position: "relative", border: isHovered && i === 0 ? `2px solid ${studioColors.image}` : `1px solid ${c.border}` }}>
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", opacity: isHovered ? 0 : 1, transition: "opacity 0.3s" }}>
             <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c.muted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
          </div>
          <motion.div 
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: isHovered ? 1 : 0, scale: isHovered ? 1 : 1.1 }}
            transition={{ duration: 0.8, delay: isHovered ? i * 0.15 : 0 }}
            style={{ position: "absolute", inset: 0, background: `linear-gradient(135deg, hsl(${i * 60 + 200}, 70%, 65%), hsl(${i * 60 + 260}, 70%, 45%))`, filter: "contrast(1.2)" }}
          />
        </motion.div>
      ))}
    </div>
  </UIFrame>
);

const DataStudioMockup = ({ isHovered }: { isHovered: boolean }) => (
  <UIFrame isHovered={isHovered}>
    <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", padding: "0.5rem 1rem", borderBottom: `1px solid ${c.border}`, gap: "1rem", background: "#fafafa" }}>
         <div style={{ height: "4px", width: "20%", background: c.muted, borderRadius: "2px" }} />
         <div style={{ height: "4px", width: "20%", background: c.border, borderRadius: "2px" }} />
         <div style={{ height: "4px", width: "20%", background: c.border, borderRadius: "2px" }} />
      </div>
      <div style={{ flex: 1, position: "relative", padding: "1rem" }}>
        <div style={{ position: "absolute", inset: "1rem", borderBottom: `1px dashed ${c.border}`, borderTop: `1px dashed ${c.border}`, display: "flex", alignItems: "center" }}>
          <div style={{ width: "100%", height: "1px", borderTop: `1px dashed ${c.border}` }} />
        </div>
        <svg width="100%" height="100%" viewBox="0 0 100 50" preserveAspectRatio="none" style={{ position: "relative", zIndex: 2 }}>
          <motion.path 
            d="M 0 45 Q 15 35, 30 40 T 60 20 T 100 10" 
            fill="none" stroke={c.data} strokeWidth="2" strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0.2 }}
            animate={{ pathLength: isHovered ? 1 : 0, opacity: isHovered ? 1 : 0.2 }}
            transition={{ duration: 1.5, ease: "easeInOut", delay: isHovered ? 0.2 : 0 }}
          />
          <motion.path 
            d="M 0 45 Q 15 35, 30 40 T 60 20 T 100 10 L 100 50 L 0 50 Z" 
            fill={`url(#data-gradient)`} 
            initial={{ opacity: 0 }}
            animate={{ opacity: isHovered ? 0.2 : 0 }}
            transition={{ duration: 1.5, ease: "easeInOut", delay: isHovered ? 0.2 : 0 }}
          />
          <defs>
            <linearGradient id="data-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={c.data} />
              <stop offset="100%" stopColor="transparent" />
            </linearGradient>
          </defs>
        </svg>
        <AnimatePresence>
          {isHovered && (
            <motion.div 
              initial={{ opacity: 0, y: 10, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }} transition={{ delay: 1.2, type: "spring" }}
              style={{ position: "absolute", top: "0.5rem", right: "1rem", background: c.ink, padding: "0.3rem 0.6rem", borderRadius: "6px", fontSize: "0.6rem", fontWeight: 800, color: "#fff", boxShadow: "0 4px 10px rgba(0,0,0,0.1)", zIndex: 10 }}
            >
              +24% ROI
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  </UIFrame>
);

const FinanceStudioMockup = ({ isHovered }: { isHovered: boolean }) => (
  <UIFrame isHovered={isHovered}>
    <div style={{ flex: 1, padding: "0.75rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
       <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.2rem" }}>
         <div>
           <div style={{ fontSize: "0.45rem", color: c.muted, textTransform: "uppercase", fontWeight: 700 }}>Revenue</div>
           <div style={{ fontSize: "0.8rem", fontWeight: 800 }}>$1.2M</div>
         </div>
         <div style={{ textAlign: "right" }}>
           <div style={{ fontSize: "0.45rem", color: c.muted, textTransform: "uppercase", fontWeight: 700 }}>Growth</div>
           <motion.div animate={{ color: isHovered ? c.data : c.ink }} style={{ fontSize: "0.8rem", fontWeight: 800 }}>+12.4%</motion.div>
         </div>
       </div>
       <div style={{ display: "flex", alignItems: "flex-end", gap: "4px", flex: 1, paddingBottom: "10px", borderBottom: `1px solid ${c.border}` }}>
         {[0.3, 0.5, 0.4, 0.7, 0.6, 0.9, 0.8].map((h, i) => (
           <div key={i} style={{ flex: 1, display: "flex", justifyContent: "center", position: "relative", height: "100%" }}>
              <div style={{ position: "absolute", width: "1px", height: `${h * 100 + 10}%`, background: c.border, bottom: "0" }} />
              <motion.div 
                initial={{ height: "20%" }}
                animate={{ height: isHovered ? `${h * 100}%` : "20%" }}
                transition={{ duration: 1, delay: i * 0.1, type: "spring", stiffness: 50 }}
                style={{ width: "100%", background: i % 2 === 0 ? c.data : studioColors.image, position: "absolute", bottom: "5%", borderRadius: "2px" }}
              />
           </div>
         ))}
       </div>
    </div>
  </UIFrame>
);

const CompareStudioMockup = ({ isHovered }: { isHovered: boolean }) => (
  <UIFrame isHovered={isHovered}>
    <div style={{ flex: 1, padding: "0.75rem", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.5rem" }}>
      {["GPT-4o", "Claude 3.5", "Gemini 1.5"].map((model, i) => (
        <motion.div 
          key={model} 
          animate={{ scale: isHovered && i === 1 ? 1.05 : 1, y: isHovered && i === 1 ? -2 : 0, opacity: isHovered && i !== 1 ? 0.7 : 1, borderColor: isHovered && i === 1 ? c.compare : c.border }}
          style={{ background: c.canvas, borderRadius: "6px", border: `1px solid ${c.border}`, padding: "0.5rem", display: "flex", flexDirection: "column", position: "relative" }}
        >
          <div style={{ fontSize: "0.5rem", fontWeight: 800, color: c.ink, marginBottom: "0.4rem" }}>{model}</div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            <motion.div initial={{ width: "10%" }} animate={{ width: isHovered ? ["10%", "100%"] : "10%" }} transition={{ duration: 1.5, delay: isHovered ? i * 0.2 : 0, ease: "easeOut" }} style={{ height: "4px", background: c.subtle, borderRadius: "2px" }} />
            <motion.div initial={{ width: "10%" }} animate={{ width: isHovered ? ["10%", "80%"] : "10%" }} transition={{ duration: 1.5, delay: isHovered ? i * 0.2 + 0.2 : 0, ease: "easeOut" }} style={{ height: "4px", background: c.subtle, borderRadius: "2px" }} />
            <motion.div initial={{ width: "10%" }} animate={{ width: isHovered ? ["10%", "60%"] : "10%" }} transition={{ duration: 1.5, delay: isHovered ? i * 0.2 + 0.4 : 0, ease: "easeOut" }} style={{ height: "4px", background: c.subtle, borderRadius: "2px" }} />
          </div>
          <AnimatePresence>
            {isHovered && i === 1 && (
              <motion.div 
                initial={{ opacity: 0, scale: 0, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ delay: 2, type: "spring" }} 
                style={{ position: "absolute", bottom: "-6px", left: "50%", transform: "translateX(-50%)", background: `linear-gradient(135deg, ${c.primary}, ${c.compare})`, color: "#fff", fontSize: "0.45rem", fontWeight: 800, padding: "2px 6px", borderRadius: "99px", zIndex: 10, boxShadow: "0 4px 10px rgba(139, 92, 246, 0.3)" }}
              >
                WINNER
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      ))}
    </div>
  </UIFrame>
);

const BentoItem = ({ s, i }: any) => {
  const [isHovered, setIsHovered] = useState(false);
  
  let gridColumn = "span 4";
  if (i === 0) gridColumn = "span 8";
  if (i === 1) gridColumn = "span 4";
  if (i === 2) gridColumn = "span 4";
  if (i === 3) gridColumn = "span 4";
  if (i === 4) gridColumn = "span 4";
  if (i === 5) gridColumn = "span 12";

  return (
    <motion.div
      variants={fadeUp}
      onMouseEnter={(e) => {
        setIsHovered(true);
        e.currentTarget.style.transform = "translateY(-5px) scale(1.01)";
        e.currentTarget.style.boxShadow = `0 20px 50px ${s.color}20, inset 0 0 0 1px ${s.color}50`;
        const bg = e.currentTarget.querySelector('.bento-bg') as HTMLElement;
        if(bg) bg.style.opacity = "1";
      }}
      onMouseLeave={(e) => {
        setIsHovered(false);
        e.currentTarget.style.transform = "translateY(0) scale(1)";
        e.currentTarget.style.boxShadow = "0 10px 40px rgba(0,0,0,0.03), inset 0 0 0 1px rgba(255,255,255,0.5)";
        const bg = e.currentTarget.querySelector('.bento-bg') as HTMLElement;
        if(bg) bg.style.opacity = "0";
      }}
      style={{
        gridColumn,
        background: "rgba(255,255,255,0.7)",
        backdropFilter: "blur(20px)",
        borderRadius: "24px",
        border: `1px solid rgba(255,255,255,0.8)`,
        padding: "3rem",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        position: "relative",
        overflow: "hidden",
        boxShadow: "0 10px 40px rgba(0,0,0,0.03), inset 0 0 0 1px rgba(255,255,255,0.5)",
        transition: "all 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    >
      <div className="bento-bg" style={{ position: "absolute", inset: 0, background: `radial-gradient(circle at 80% 20%, ${s.color}15 0%, transparent 60%)`, opacity: 0, transition: "opacity 0.4s ease", pointerEvents: "none" }} />

      <div style={{ position: "relative", zIndex: 2 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem" }}>
          <div style={{ width: "48px", height: "48px", borderRadius: "14px", background: `${s.color}15`, display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${s.color}30` }}>
             <div style={{ width: "16px", height: "16px", borderRadius: "4px", background: s.color }} />
          </div>
          <h3 style={{ fontFamily: heading, fontSize: "1.5rem", fontWeight: 800, letterSpacing: "-0.02em", color: c.ink }}>
            {s.name}
          </h3>
        </div>
        <p style={{ fontFamily: body, fontSize: "1.05rem", color: c.muted, lineHeight: 1.6, maxWidth: "80%" }}>
          {s.desc}
        </p>

        {s.name === "Writing Studio" && <WritingStudioMockup isHovered={isHovered} />}
        {s.name === "Research Studio" && <ResearchStudioMockup isHovered={isHovered} />}
        {s.name === "Image Studio" && <ImageStudioMockup isHovered={isHovered} />}
        {s.name === "Data Studio" && <DataStudioMockup isHovered={isHovered} />}
        {s.name === "Finance Studio" && <FinanceStudioMockup isHovered={isHovered} />}
        {s.name === "Model Compare" && <CompareStudioMockup isHovered={isHovered} />}
      </div>
    </motion.div>
  );
}

// --- 3D SCENE ---
function CognitiveCore() {
  const group = useRef<THREE.Group>(null);
  const { viewport, camera } = useThree();
  const mouse = useRef({ x: 0, y: 0 });
  const targetPos = useRef(new THREE.Vector3());

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouse.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const isMobile = viewport.width < 8;
  const xOffset = isMobile ? 0 : viewport.width * 0.22;
  const yOffset = isMobile ? 2 : 0;

  useFrame((state) => {
    if (group.current) {
      const t = state.clock.elapsedTime;
      targetPos.current.set(xOffset, yOffset, 0);
      targetPos.current.project(camera);
      
      const dx = mouse.current.x - targetPos.current.x;
      const dy = mouse.current.y - targetPos.current.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      const influence = Math.max(0, 1 - dist / 0.6); 
      const smoothInfluence = influence * influence; 

      const idleY = t * 0.15;
      const idleX = Math.sin(t * 0.3) * 0.1;

      const targetRotY = idleY + (dx * Math.PI * 0.5) * smoothInfluence;
      const targetRotX = idleX + (-dy * Math.PI * 0.5) * smoothInfluence;

      group.current.rotation.y = THREE.MathUtils.lerp(group.current.rotation.y, targetRotY, 0.08);
      group.current.rotation.x = THREE.MathUtils.lerp(group.current.rotation.x, targetRotX, 0.08);
    }
  });

  return (
    <group position={[xOffset, yOffset, 0]} ref={group} scale={0.6}>
      <Float speed={2} rotationIntensity={0.2} floatIntensity={0.5}>
        <mesh>
          <icosahedronGeometry args={[2, 0]} />
          <MeshTransmissionMaterial backside backsideThickness={0.5} thickness={0.8} roughness={0.02} chromaticAberration={0.3} color="#ffffff" transmission={1} ior={1.3} clearcoat={1} />
        </mesh>
        <mesh>
          <sphereGeometry args={[0.5, 32, 32]} />
          <meshStandardMaterial color={c.primary} emissive={c.primary} emissiveIntensity={2.5} toneMapped={false} />
        </mesh>
        {studios.map((studio, i) => {
          const angle = (i / studios.length) * Math.PI * 2;
          const radius = 3.2;
          const x = Math.cos(angle) * radius;
          const z = Math.sin(angle) * radius;
          const y = Math.sin(angle * 3) * 0.6;
          const NodeGeometry = i % 3 === 0 ? Box : i % 3 === 1 ? Sphere : Octahedron;
          return (
            <Float key={studio.name} speed={3 + i * 0.5} rotationIntensity={2} floatIntensity={1} position={[x, y, z]}>
              <NodeGeometry args={i % 3 === 1 ? [0.25, 32, 32] as any : [0.3] as any}>
                <meshPhysicalMaterial color={studio.color} emissive={studio.color} emissiveIntensity={0.8} roughness={0.1} metalness={0.9} clearcoat={1} />
              </NodeGeometry>
            </Float>
          );
        })}
        <mesh rotation={[Math.PI / 2.1, 0.1, 0]}>
          <torusGeometry args={[3.2, 0.005, 64, 100]} />
          <meshStandardMaterial color="#6B6B70" transparent opacity={0.4} />
        </mesh>
        <mesh rotation={[-Math.PI / 2.1, -0.1, 0]}>
          <torusGeometry args={[3.2, 0.005, 64, 100]} />
          <meshStandardMaterial color="#6B6B70" transparent opacity={0.2} />
        </mesh>
        <Environment preset="city" />
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1.5} color="#ffffff" />
        <directionalLight position={[-10, -10, -5]} intensity={1} color={c.primary} />
      </Float>
    </group>
  );
}

// --- SCROLLYTELLING COMPONENT ---
const ManifestoScrollytelling = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start 75%", "center center"] 
  });

  const text = "The chat interface is dead. It's great for trivia, terrible for real work. You don't build software in a chat window. Why are you doing your cognitive work in one? Stop chatting. Start building.";
  const words = text.split(" ");

  return (
    <section ref={containerRef} style={{ padding: "10rem 2rem", background: c.ink, color: c.surface, position: "relative", zIndex: 10, minHeight: "80vh", display: "flex", alignItems: "center" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <h2 style={{ fontFamily: heading, fontSize: "clamp(2rem, 5vw, 5rem)", fontWeight: 800, lineHeight: 1.1, letterSpacing: "-0.04em", display: "flex", flexWrap: "wrap", gap: "0.2em 0.4em" }}>
          {words.map((word, i) => {
            const start = i / words.length;
            const end = start + (1 / words.length);
            const opacity = useTransform(scrollYProgress, [start, end], [0.15, 1]);
            const isHighlight = word.toLowerCase().includes("building.") || word.toLowerCase().includes("start") || word.toLowerCase().includes("stop");
            const color = isHighlight ? c.primary : c.surface;
            
            return (
              <motion.span key={i} style={{ opacity, color }}>
                {word}
              </motion.span>
            )
          })}
        </h2>
      </div>
    </section>
  )
}

// --- MAIN COMPONENT ---
export default function AtelierPlusLanding() {
  const [cursorVariant, setCursorVariant] = useState<"default" | "play" | "rotate">("default");
  
  const { scrollYProgress } = useScroll();
  const y = useTransform(scrollYProgress, [0, 1], [0, 200]);
  const opacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);

  return (
    <div style={{ minHeight: "100vh", background: c.canvas, color: c.ink, fontFamily: body, overflow: "hidden", cursor: "none" }}>
      <NoiseOverlay />
      <CustomCursor variant={cursorVariant} />

      <style>{`
        * { cursor: none !important; }
      `}</style>
      
      {/* Precision Grid Background */}
      <div 
        style={{
          position: "fixed",
          inset: 0,
          backgroundImage: `
            linear-gradient(to right, ${c.border} 1px, transparent 1px),
            linear-gradient(to bottom, ${c.border} 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
          opacity: 0.3,
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      {/* Navigation */}
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        style={{
          position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
          padding: "1.5rem 2rem", display: "flex", justifyContent: "space-between", alignItems: "center",
          background: "rgba(242, 242, 240, 0.8)", backdropFilter: "blur(12px)", borderBottom: `1px solid rgba(226, 226, 224, 0.5)`,
        }}
      >
        <Link to="/" onMouseEnter={() => setCursorVariant("play")} onMouseLeave={() => setCursorVariant("default")} style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div style={{ position: "relative", width: "28px", height: "28px" }}>
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }} style={{ position: "absolute", inset: 0, borderRadius: "6px", background: `linear-gradient(135deg, ${c.primary}, ${c.accent})` }} />
            <div style={{ position: "absolute", inset: "2px", borderRadius: "4px", background: c.surface }} />
            <div style={{ position: "absolute", inset: "6px", borderRadius: "2px", background: c.ink }} />
          </div>
          <span style={{ fontFamily: heading, fontSize: "1.2rem", fontWeight: 800, color: c.ink, letterSpacing: "-0.03em" }}>
            Beyond Chat <span style={{ color: c.primary, fontWeight: 500, fontSize: "1rem" }}>+</span>
          </span>
        </Link>

        <div style={{ display: "flex", alignItems: "center", gap: "2.5rem" }}>
          <div style={{ display: "none", gap: "2rem", alignItems: "center" }} className="md-flex">
            <Link to="/" onMouseEnter={() => setCursorVariant("play")} onMouseLeave={() => setCursorVariant("default")} style={{ fontFamily: body, fontSize: "0.85rem", fontWeight: 600, color: c.ink, textDecoration: "none" }}>Home</Link>
            <Link to="/pricing" onMouseEnter={() => setCursorVariant("play")} onMouseLeave={() => setCursorVariant("default")} style={{ fontFamily: body, fontSize: "0.85rem", fontWeight: 600, color: c.muted, textDecoration: "none", transition: "color 0.2s" }} onFocus={e => e.currentTarget.style.color = c.ink} onBlur={e => e.currentTarget.style.color = c.muted}>Pricing</Link>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <Link to="/login" onMouseEnter={() => setCursorVariant("play")} onMouseLeave={() => setCursorVariant("default")} style={{ fontFamily: body, fontSize: "0.85rem", fontWeight: 600, color: c.ink, textDecoration: "none" }}>Log in</Link>
            <Link
              to="/login"
              onMouseEnter={(e) => { setCursorVariant("play"); e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,0,0,0.15)"; }}
              onMouseLeave={(e) => { setCursorVariant("default"); e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 14px rgba(0,0,0,0.1)"; }}
              style={{ fontFamily: body, fontSize: "0.85rem", fontWeight: 700, color: "#fff", textDecoration: "none", background: c.ink, padding: "0.6rem 1.4rem", borderRadius: "99px", transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)", boxShadow: "0 4px 14px rgba(0,0,0,0.1)", position: "relative", overflow: "hidden" }}
            >
              Get Access
            </Link>
          </div>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <section style={{ position: "relative", minHeight: "100vh", display: "flex", alignItems: "center", paddingTop: "80px", zIndex: 10 }}>
        
        {/* Full-Bleed 3D Overlay */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: "-20vh", zIndex: 20, pointerEvents: "none", overflow: "visible" }}>
          <Canvas camera={{ position: [0, 0, 14], fov: 45 }}>
            <CognitiveCore />
          </Canvas>
        </div>

        {/* Right Invisible Hover Area for Rotate Cursor */}
        <div 
          onMouseEnter={() => setCursorVariant("rotate")} 
          onMouseLeave={() => setCursorVariant("default")}
          style={{ position: "absolute", right: 0, top: 0, width: "50%", height: "100%", zIndex: 30 }}
        />

        {/* Content Container */}
        <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "0 2rem", width: "100%", position: "relative", zIndex: 40 }}>
          
          <motion.div style={{ y, opacity, maxWidth: "680px", position: "relative" }} initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 1, ease: "easeOut" }}>
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2, duration: 0.5 }} style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", padding: "0.4rem 1rem", background: "rgba(255,255,255,0.6)", backdropFilter: "blur(10px)", border: `1px solid rgba(0,0,0,0.05)`, borderRadius: "99px", marginBottom: "2rem", boxShadow: "0 2px 10px rgba(0,0,0,0.02)" }}>
              <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: c.primary, boxShadow: `0 0 10px ${c.primary}` }} />
              <span style={{ fontFamily: body, fontSize: "0.8rem", fontWeight: 700, color: c.primary, letterSpacing: "0.05em", textTransform: "uppercase" }}>Next-Gen Workspace</span>
            </motion.div>

            <h1 style={{ fontFamily: heading, fontSize: "clamp(3rem, 6.5vw, 5.5rem)", fontWeight: 800, lineHeight: 0.95, letterSpacing: "-0.04em", marginBottom: "1.5rem", color: c.ink }}>
              Cognitive architecture for <span style={{ color: c.primary }}>professionals.</span>
            </h1>

            <p style={{ fontFamily: body, fontSize: "clamp(1.1rem, 2vw, 1.25rem)", color: c.muted, lineHeight: 1.6, maxWidth: "540px", marginBottom: "3rem", fontWeight: 400 }}>
              Move beyond linear chat. Interact with specialized AI models in a multi-dimensional, structured environment designed for rigorous knowledge work.
            </p>

            <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap", position: "relative", zIndex: 50 }}>
              <Link
                to="/login"
                onMouseEnter={(e) => { setCursorVariant("play"); e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = `0 12px 40px ${c.primary}60`; }}
                onMouseLeave={(e) => { setCursorVariant("default"); e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = `0 8px 30px ${c.primary}40`; }}
                style={{ fontFamily: body, fontSize: "1rem", fontWeight: 700, color: "#fff", textDecoration: "none", background: c.primary, padding: "1rem 2.5rem", borderRadius: "12px", display: "inline-flex", alignItems: "center", gap: "0.5rem", transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)", boxShadow: `0 8px 30px ${c.primary}40` }}
              >
                Start building
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </Link>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                <span style={{ fontSize: "0.8rem", fontWeight: 600, color: c.ink }}>Free 14-day trial.</span>
                <span style={{ fontSize: "0.8rem", color: c.muted }}>No credit card required.</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Manifesto Scrollytelling Section */}
      <ManifestoScrollytelling />

      {/* Bento Grid Studios Section */}
      <section style={{ padding: "8rem 2rem", position: "relative", zIndex: 10 }}>
        <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
          
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeUp} style={{ marginBottom: "4rem", textAlign: "center" }}>
            <h2 style={{ fontFamily: heading, fontSize: "clamp(2.5rem, 5vw, 4rem)", fontWeight: 800, letterSpacing: "-0.04em", color: c.ink, marginBottom: "1rem" }}>
              Modular Intelligence.
            </h2>
            <p style={{ fontFamily: body, fontSize: "1.2rem", color: c.muted, maxWidth: "600px", margin: "0 auto" }}>
              Distinct environments crafted for specific workflows. Stop wrangling generic chats and start utilizing specialized studios.
            </p>
          </motion.div>

          <motion.div 
            initial="hidden" 
            whileInView="visible" 
            viewport={{ once: true, margin: "-100px" }} 
            variants={stagger}
            style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: "1.5rem", autoRows: "minmax(280px, auto)" } as any}
            className="bento-grid"
          >
            {studios.map((s, i) => (
              <BentoItem key={s.name} s={s} i={i} setCursorVariant={setCursorVariant} />
            ))}
          </motion.div>
        </div>
      </section>

      {/* Social Proof / Faux Testimonials */}
      <section style={{ padding: "8rem 2rem", background: c.surface, borderTop: `1px solid ${c.border}`, position: "relative", zIndex: 10 }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          
          <div style={{ textAlign: "center", marginBottom: "4rem" }}>
             <h2 style={{ fontFamily: heading, fontSize: "clamp(2rem, 4vw, 3rem)", fontWeight: 800, letterSpacing: "-0.03em", color: c.ink }}>Built for reality.</h2>
          </div>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={stagger} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "2rem" }}>
            
            <motion.div variants={fadeUp} style={{ background: c.canvas, padding: "2.5rem", borderRadius: "24px", border: `1px solid ${c.border}`, boxShadow: "0 10px 30px rgba(0,0,0,0.02)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem" }}>
                <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "#EAEAE8", overflow: "hidden" }}><img src="https://i.pravatar.cc/150?img=12" alt="Alex D" style={{ width: "100%", height: "100%", objectFit: "cover", filter: "grayscale(100%)" }}/></div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: "1rem", color: c.ink }}>Alex D.</div>
                  <div style={{ color: c.muted, fontSize: "0.85rem" }}>@alex_dev</div>
                </div>
              </div>
              <p style={{ fontSize: "1.1rem", color: c.ink, lineHeight: 1.6 }}>ChatGPT is cool but I feel like I'm pasting the same context 10x a day. Why isn't there a real workspace for this? The linear thread is fundamentally broken for engineering.</p>
            </motion.div>

            <motion.div variants={fadeUp} style={{ background: c.ink, padding: "2.5rem", borderRadius: "24px", border: `1px solid rgba(255,255,255,0.1)`, boxShadow: `0 20px 40px ${c.primary}30`, position: "relative" }}>
              <div style={{ position: "absolute", top: "-15px", right: "24px", background: `linear-gradient(135deg, ${c.primary}, ${c.accent})`, color: "#fff", padding: "0.3rem 1rem", borderRadius: "99px", fontSize: "0.75rem", fontWeight: 800, letterSpacing: "0.05em" }}>THE FIX</div>
              <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem" }}>
                <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "#EAEAE8", overflow: "hidden" }}><img src="https://i.pravatar.cc/150?img=32" alt="Sarah J" style={{ width: "100%", height: "100%", objectFit: "cover", filter: "grayscale(100%)" }}/></div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: "1rem", color: "#fff" }}>Sarah Jenkins</div>
                  <div style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.85rem" }}>@sarahj_product</div>
                </div>
              </div>
              <p style={{ fontSize: "1.1rem", color: "#fff", lineHeight: 1.6 }}>Switched my team to Atelier Plus. The Data Studio literally wrote our Q3 analysis report autonomously in 4 minutes. <span style={{ color: c.primary }}>It's not a wrapper, it's a colleague. 🤯</span></p>
            </motion.div>

          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section style={{ padding: "8rem 2rem", position: "relative", zIndex: 10, background: c.ink, color: c.surface, overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "-50%", left: "-10%", width: "60%", height: "200%", background: "radial-gradient(ellipse at center, rgba(79, 63, 232, 0.2) 0%, transparent 60%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: "-50%", right: "-10%", width: "60%", height: "200%", background: "radial-gradient(ellipse at center, rgba(229, 86, 19, 0.2) 0%, transparent 60%)", pointerEvents: "none" }} />

        <div style={{ maxWidth: "800px", margin: "0 auto", textAlign: "center", position: "relative", zIndex: 2 }}>
          <motion.div initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.8, ease: "easeOut" }}>
            <h2 style={{ fontFamily: heading, fontSize: "clamp(3rem, 6vw, 5rem)", fontWeight: 800, letterSpacing: "-0.04em", marginBottom: "1.5rem", lineHeight: 1 }}>
              Elevate your <br/><span style={{ color: c.surface, opacity: 0.5 }}>workflow today.</span>
            </h2>
            <p style={{ fontFamily: body, fontSize: "1.2rem", color: "rgba(255,255,255,0.7)", marginBottom: "3rem", lineHeight: 1.6, maxWidth: "500px", margin: "0 auto 3rem" }}>
              Join forward-thinking professionals organizing their AI interactions into structured, powerful studios.
            </p>
            <Link
              to="/login"
              onMouseEnter={(e) => { setCursorVariant("play"); e.currentTarget.style.transform = "scale(1.05)"; }}
              onMouseLeave={(e) => { setCursorVariant("default"); e.currentTarget.style.transform = "scale(1)"; }}
              style={{ fontFamily: body, fontSize: "1.1rem", fontWeight: 700, color: c.ink, textDecoration: "none", background: c.surface, padding: "1.2rem 3rem", borderRadius: "99px", display: "inline-flex", alignItems: "center", gap: "0.5rem", transition: "transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)" }}
            >
              Get Started
            </Link>
          </motion.div>
        </div>
      </section>

      <style>{`
        @media (min-width: 768px) {
          .md-flex { display: flex !important; }
        }
        @media (max-width: 1024px) {
          .bento-grid { display: flex !important; flex-direction: column; }
          .bento-item { grid-column: auto !important; }
        }
      `}</style>
    </div>
  );
}
