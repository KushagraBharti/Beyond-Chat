import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValue, useSpring } from "framer-motion";

export default function GlobalCursor() {
  const [enabled, setEnabled] = useState(false);
  const [variant, setVariant] = useState<"default" | "play">("default");
  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const smoothX = useSpring(x, { stiffness: 1100, damping: 42, mass: 0.12 });
  const smoothY = useSpring(y, { stiffness: 1100, damping: 42, mass: 0.12 });
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const media = window.matchMedia("(pointer: fine)");
    const syncEnabled = () => {
      const active = media.matches;
      setEnabled(active);
      document.documentElement.classList.toggle("global-custom-cursor", active);
    };

    const resolveVariant = (target: EventTarget | null) => {
      if (!(target instanceof Element)) {
        setVariant("default");
        return;
      }

      const interactive = target.closest(
        "a, button, [role='button'], input[type='button'], input[type='submit'], input[type='range'], summary, [data-cursor='play']",
      );

      setVariant(interactive ? "play" : "default");
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (!media.matches) {
        return;
      }

      resolveVariant(event.target);
      x.set(event.clientX - 16);
      y.set(event.clientY - 16);
    };

    const handlePointerOver = (event: PointerEvent) => {
      resolveVariant(event.target);
    };

    syncEnabled();
    media.addEventListener("change", syncEnabled);
    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("pointerover", handlePointerOver, { passive: true });

    return () => {
      media.removeEventListener("change", syncEnabled);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerover", handlePointerOver);
      document.documentElement.classList.remove("global-custom-cursor");
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [x, y]);

  if (!enabled) {
    return null;
  }

  const isPlay = variant === "play";

  return (
    <motion.div
      aria-hidden="true"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        x: smoothX,
        y: smoothY,
        pointerEvents: "none",
        zIndex: 10000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <motion.div
        animate={{
          width: isPlay ? 48 : 32,
          height: isPlay ? 48 : 32,
          backgroundColor: isPlay ? "#4F3FE8" : "rgba(79, 63, 232, 0.5)",
          x: isPlay ? -8 : 0,
          y: isPlay ? -8 : 0,
        }}
        transition={{ duration: 0.08, ease: "easeOut" }}
        style={{
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backdropFilter: isPlay ? "none" : "blur(4px)",
          mixBlendMode: isPlay ? "normal" : "difference",
        }}
      >
        <AnimatePresence mode="wait">
          {isPlay ? (
            <motion.div
              key="play"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0 }}
              style={{ display: "flex" }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
