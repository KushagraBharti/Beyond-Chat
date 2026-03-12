export const headingFont = "'Bricolage Grotesque', sans-serif";
export const bodyFont = "'Plus Jakarta Sans', sans-serif";

export const theme = {
  canvas: "#F2F2F0",
  surface: "#FFFFFF",
  ink: "#0D0D0D",
  primary: "#4F3FE8",
  accent: "#E55613",
  muted: "#6B6B70",
  border: "#E2E2E0",
  subtle: "#EAEAE8",
  research: "#0E7AE6",
  image: "#E5484D",
  data: "#30A46C",
  finance: "#E55613",
  chat: "#111827",
  artifact: "#A855F7",
} as const;

export const studioColors = {
  home: theme.ink,
  chat: theme.chat,
  writing: theme.primary,
  research: theme.research,
  image: theme.image,
  data: theme.data,
  finance: theme.finance,
  artifacts: theme.artifact,
  settings: theme.muted,
} as const;

export const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const },
  },
};

export const stagger = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08,
    },
  },
};
