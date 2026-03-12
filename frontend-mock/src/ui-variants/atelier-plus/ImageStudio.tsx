import React, { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

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
    image: "#E5484D"
};

export default function AtelierPlusImageStudio() {
    const [prompt, setPrompt] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedImages, setGeneratedImages] = useState<string[]>([]);
    const [aspectRatio, setAspectRatio] = useState("1:1");
    const [style, setStyle] = useState("Cinematic");

    const handleGenerate = (e: React.FormEvent) => {
        e.preventDefault();
        if (!prompt.trim()) return;

        setIsGenerating(true);
        // Simulate generation delay
        setTimeout(() => {
            // Fake image generation by grabbing random aesthetically pleasing placeholders
            const newImages = [
                `https://picsum.photos/seed/${Math.random()}/800/800`,
                `https://picsum.photos/seed/${Math.random()}/800/800`,
                `https://picsum.photos/seed/${Math.random()}/800/800`,
                `https://picsum.photos/seed/${Math.random()}/800/800`
            ];
            setGeneratedImages(newImages);
            setIsGenerating(false);
        }, 2000);
    };

    return (
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", fontFamily: body, background: c.canvas, color: c.ink }}>

            {/* Top Nav */}
            <header style={{
                height: "64px",
                borderBottom: `1px solid ${c.border}`,
                background: c.surface,
                display: "flex",
                alignItems: "center",
                padding: "0 1.5rem",
                justifyContent: "space-between",
                position: "sticky",
                top: 0,
                zIndex: 100
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                    <Link to="/atelier-plus" style={{ textDecoration: "none", color: c.muted, display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", fontWeight: 600 }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                        Back
                    </Link>
                    <div style={{ width: "1px", height: "24px", background: c.border }} />
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                        <div style={{ width: "24px", height: "24px", borderRadius: "6px", background: `${c.image}15`, display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${c.image}30` }}>
                            <div style={{ width: "10px", height: "10px", borderRadius: "3px", background: c.image }} />
                        </div>
                        <span style={{ fontFamily: heading, fontSize: "1.1rem", fontWeight: 700, letterSpacing: "-0.01em" }}>Image Studio</span>
                    </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                    <span style={{ fontSize: "0.8rem", fontWeight: 600, color: c.muted, background: c.subtle, padding: "0.3rem 0.6rem", borderRadius: "99px" }}>24 credits</span>
                    <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: c.border, overflow: "hidden" }}>
                        <img src="https://i.pravatar.cc/100?img=32" alt="Avatar" style={{ width: "100%", height: "100%", objectFit: "cover", filter: "grayscale(100%)" }} />
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main style={{ flex: 1, display: "flex", overflow: "hidden" }}>

                {/* Left Sidebar - Controls */}
                <aside style={{
                    width: "320px",
                    background: c.surface,
                    borderRight: `1px solid ${c.border}`,
                    display: "flex",
                    flexDirection: "column",
                    padding: "1.5rem",
                    overflowY: "auto"
                }}>
                    <form onSubmit={handleGenerate} style={{ display: "flex", flexDirection: "column", gap: "1.5rem", flex: 1 }}>

                        {/* Prompt Input */}
                        <div>
                            <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, marginBottom: "0.5rem", color: c.ink, textTransform: "uppercase", letterSpacing: "0.05em" }}>Prompt</label>
                            <textarea
                                value={prompt}
                                onChange={e => setPrompt(e.target.value)}
                                placeholder="Describe what you want to see..."
                                style={{
                                    width: "100%",
                                    height: "120px",
                                    padding: "0.85rem 1rem",
                                    borderRadius: "12px",
                                    border: `1px solid ${c.border}`,
                                    background: c.canvas,
                                    fontFamily: body,
                                    fontSize: "0.95rem",
                                    color: c.ink,
                                    outline: "none",
                                    resize: "none",
                                    transition: "all 0.2s"
                                }}
                                onFocus={e => { e.currentTarget.style.borderColor = c.image; e.currentTarget.style.boxShadow = `0 0 0 3px ${c.image}15`; }}
                                onBlur={e => { e.currentTarget.style.borderColor = c.border; e.currentTarget.style.boxShadow = "none"; }}
                            />
                        </div>

                        {/* Aspect Ratio */}
                        <div>
                            <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, marginBottom: "0.5rem", color: c.ink, textTransform: "uppercase", letterSpacing: "0.05em" }}>Aspect Ratio</label>
                            <div style={{ display: "flex", gap: "0.5rem" }}>
                                {['1:1', '16:9', '9:16', '4:3'].map(ratio => (
                                    <button
                                        key={ratio}
                                        type="button"
                                        onClick={() => setAspectRatio(ratio)}
                                        style={{
                                            flex: 1,
                                            padding: "0.5rem 0",
                                            borderRadius: "8px",
                                            border: `1px solid ${aspectRatio === ratio ? c.image : c.border}`,
                                            background: aspectRatio === ratio ? `${c.image}08` : c.surface,
                                            color: aspectRatio === ratio ? c.image : c.muted,
                                            fontSize: "0.85rem",
                                            fontWeight: 600,
                                            cursor: "pointer",
                                            transition: "all 0.2s"
                                        }}
                                    >
                                        {ratio}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Style Preset */}
                        <div>
                            <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, marginBottom: "0.5rem", color: c.ink, textTransform: "uppercase", letterSpacing: "0.05em" }}>Style Preset</label>
                            <select
                                value={style}
                                onChange={e => setStyle(e.target.value)}
                                style={{
                                    width: "100%",
                                    padding: "0.85rem 1rem",
                                    borderRadius: "10px",
                                    border: `1px solid ${c.border}`,
                                    background: c.surface,
                                    fontFamily: body,
                                    fontSize: "0.95rem",
                                    color: c.ink,
                                    outline: "none",
                                    cursor: "pointer",
                                    appearance: "none",
                                    backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
                                    backgroundRepeat: "no-repeat",
                                    backgroundPosition: "right 1rem center",
                                    backgroundSize: "1em"
                                }}
                            >
                                <option value="Cinematic">Cinematic</option>
                                <option value="Photographic">Photographic</option>
                                <option value="Digital Art">Digital Art</option>
                                <option value="Anime">Anime</option>
                                <option value="Fantasy Art">Fantasy Art</option>
                                <option value="Neon Punk">Neon Punk</option>
                                <option value="Minimalist">Minimalist</option>
                            </select>
                        </div>

                        <div style={{ flex: 1 }} />

                        {/* Generate Button */}
                        <button
                            type="submit"
                            disabled={isGenerating || !prompt.trim()}
                            style={{
                                width: "100%",
                                padding: "1rem",
                                borderRadius: "12px",
                                background: isGenerating || !prompt.trim() ? c.muted : c.image,
                                color: "#fff",
                                fontFamily: body,
                                fontSize: "1rem",
                                fontWeight: 700,
                                border: "none",
                                cursor: isGenerating || !prompt.trim() ? "not-allowed" : "pointer",
                                transition: "all 0.2s",
                                boxShadow: isGenerating || !prompt.trim() ? "none" : `0 4px 14px ${c.image}40`,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: "0.5rem",
                                opacity: isGenerating || !prompt.trim() ? 0.7 : 1
                            }}
                            onMouseEnter={e => { if (!isGenerating && prompt.trim()) { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = `0 6px 20px ${c.image}60`; } }}
                            onMouseLeave={e => { if (!isGenerating && prompt.trim()) { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = `0 4px 14px ${c.image}40`; } }}
                        >
                            {isGenerating ? (
                                <>
                                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} style={{ display: "flex" }}>
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg>
                                    </motion.div>
                                    Generating...
                                </>
                            ) : (
                                <>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                                    Generate Variants
                                </>
                            )}
                        </button>
                    </form>
                </aside>

                {/* Right Area - Canvas */}
                <section style={{ flex: 1, padding: "2rem", display: "flex", flexDirection: "column", overflowY: "auto" }}>

                    <div style={{ maxWidth: "1200px", margin: "0 auto", width: "100%", display: "flex", flexDirection: "column", flex: 1 }}>

                        {generatedImages.length === 0 && !isGenerating ? (
                            // Empty State
                            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", opacity: 0.6 }}>
                                <div style={{ width: "80px", height: "80px", borderRadius: "20px", background: c.surface, border: `1px dashed ${c.muted}`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1.5rem" }}>
                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={c.muted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                                </div>
                                <h3 style={{ fontFamily: heading, fontSize: "1.2rem", fontWeight: 700, color: c.ink, marginBottom: "0.5rem" }}>No images generated yet</h3>
                                <p style={{ color: c.muted, fontSize: "0.95rem", textAlign: "center", maxWidth: "300px" }}>Enter a descriptive prompt on the left to start generating visual variants.</p>
                            </div>
                        ) : (
                            // Grid State
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1.5rem" }}
                            >
                                <AnimatePresence>
                                    {isGenerating ? (
                                        // Skeleton Loaders
                                        [0, 1, 2, 3].map(i => (
                                            <motion.div
                                                key={`skeleton-${i}`}
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0 }}
                                                transition={{ delay: i * 0.1 }}
                                                style={{ aspectRatio: aspectRatio.replace(':', '/'), background: c.surface, borderRadius: "16px", border: `1px solid ${c.border}`, overflow: "hidden", position: "relative" }}
                                            >
                                                <motion.div
                                                    animate={{ x: ["-100%", "100%"] }}
                                                    transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                                                    style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: `linear-gradient(90deg, transparent, rgba(229, 72, 77, 0.05), transparent)` }}
                                                />
                                                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                                    <motion.div animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.6, 0.3] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: i * 0.2 }}>
                                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={c.image} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" /></svg>
                                                    </motion.div>
                                                </div>
                                            </motion.div>
                                        ))
                                    ) : (
                                        // Generated Images
                                        generatedImages.map((src, i) => (
                                            <motion.div
                                                key={`${src}-${i}`}
                                                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                transition={{ delay: i * 0.15, type: "spring", stiffness: 100 }}
                                                whileHover={{ y: -5, boxShadow: "0 20px 40px rgba(0,0,0,0.1)" }}
                                                style={{ aspectRatio: aspectRatio.replace(':', '/'), background: c.surface, borderRadius: "16px", overflow: "hidden", border: `1px solid ${c.border}`, position: "relative", cursor: "pointer" }}
                                                className="image-card group"
                                            >
                                                <img src={src} alt={`Variant ${i + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.5s" }} className="card-img" />

                                                {/* Hover Overlay */}
                                                <div className="card-overlay" style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.5), transparent)", opacity: 0, transition: "opacity 0.2s", display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: "1.5rem" }}>
                                                    <div style={{ display: "flex", gap: "0.5rem" }}>
                                                        <button style={{ flex: 1, padding: "0.6rem", borderRadius: "8px", background: "rgba(255,255,255,0.2)", backdropFilter: "blur(10px)", color: "#fff", fontWeight: 600, fontSize: "0.85rem", border: "1px solid rgba(255,255,255,0.3)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem" }}>
                                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                                                            Save
                                                        </button>
                                                        <button style={{ padding: "0.6rem 0.8rem", borderRadius: "8px", background: c.image, color: "#fff", fontWeight: 600, fontSize: "0.85rem", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem" }}>
                                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12h4l2-9 5 18 2-9h5"></path></svg>
                                                            Vary
                                                        </button>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ))
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        )}

                    </div>
                </section>
            </main>
            <style>{`
        .image-card:hover .card-img { transform: scale(1.03); }
        .image-card:hover .card-overlay { opacity: 1; }
      `}</style>
        </div>
    );
}
