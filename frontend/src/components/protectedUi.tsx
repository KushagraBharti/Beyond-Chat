import { motion } from "framer-motion";
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  PropsWithChildren,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { bodyFont, fadeUp, headingFont, theme } from "../lib/theme";

export function AmbientBackground() {
  return (
    <>
      <div className="app-grid-background" />
      <div className="app-noise-overlay" />
      <div className="app-glow app-glow-primary" />
      <div className="app-glow app-glow-accent" />
    </>
  );
}

export function PageSection({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="page-section-header">
      <div>
        {eyebrow ? <div className="page-eyebrow">{eyebrow}</div> : null}
        <h1 className="page-title">{title}</h1>
        {description ? <p className="page-description">{description}</p> : null}
      </div>
      {actions ? <div className="page-section-actions">{actions}</div> : null}
    </div>
  );
}

export function MotionCard({
  children,
  className = "",
  accent,
}: PropsWithChildren<{ className?: string; accent?: string }>) {
  return (
    <motion.div
      variants={fadeUp}
      className={`glass-card ${className}`.trim()}
      style={accent ? { boxShadow: `0 16px 40px ${accent}15`, borderColor: `${accent}30` } : undefined}
    >
      {children}
    </motion.div>
  );
}

export function PrimaryButton({
  children,
  className = "",
  ...props
}: PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement> & { className?: string }>) {
  return (
    <button className={`button button-primary ${className}`.trim()} {...props}>
      {children}
    </button>
  );
}

export function SecondaryButton({
  children,
  className = "",
  ...props
}: PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement> & { className?: string }>) {
  return (
    <button className={`button button-secondary ${className}`.trim()} {...props}>
      {children}
    </button>
  );
}

export function GhostButton({
  children,
  className = "",
  ...props
}: PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement> & { className?: string }>) {
  return (
    <button className={`button button-ghost ${className}`.trim()} {...props}>
      {children}
    </button>
  );
}

export function StatusBadge({
  status,
  label,
}: {
  status: "connected" | "disconnected" | "not_configured" | "error" | "completed" | "failed" | "running";
  label?: string;
}) {
  return <span className={`status-badge status-${status}`}>{label ?? status.replaceAll("_", " ")}</span>;
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <div className="empty-state-orb" />
      <h3>{title}</h3>
      <p>{body}</p>
      {action}
    </div>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`field ${props.className ?? ""}`.trim()} />;
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`field field-area ${props.className ?? ""}`.trim()} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`field ${props.className ?? ""}`.trim()} />;
}

export function FieldLabel({ children }: PropsWithChildren) {
  return <label className="field-label">{children}</label>;
}

export function AppBrand({ compact = false }: { compact?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: compact ? "0.65rem" : "0.8rem" }}>
      <div style={{ position: "relative", width: compact ? 24 : 28, height: compact ? 24 : 28 }}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: compact ? 5 : 6,
            background: `linear-gradient(135deg, ${theme.primary}, ${theme.accent})`,
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 2,
            borderRadius: compact ? 3 : 4,
            background: theme.surface,
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: compact ? 6 : 7,
            borderRadius: 2,
            background: theme.ink,
          }}
        />
      </div>
      <span
        style={{
          fontFamily: headingFont,
          fontSize: compact ? "1rem" : "1.15rem",
          fontWeight: 800,
          color: theme.ink,
          letterSpacing: "-0.03em",
        }}
      >
        Beyond Chat
      </span>
    </div>
  );
}

export function MonoMeta({ children }: PropsWithChildren) {
  return (
    <span
      style={{
        fontFamily: bodyFont,
        textTransform: "uppercase",
        letterSpacing: "0.18em",
        fontWeight: 800,
        fontSize: "0.68rem",
        color: theme.muted,
      }}
    >
      {children}
    </span>
  );
}
