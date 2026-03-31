import { defineConfig, presetUno } from "unocss";

export default defineConfig({
  presets: [presetUno()],
  theme: {
    fontFamily: {
      sans: '"DM Sans", "PingFang SC", "Microsoft YaHei", sans-serif',
      display: '"Space Grotesk", "DM Sans", "PingFang SC", sans-serif',
    },
    colors: {
      app: {
        bg: "var(--app-bg)",
        "bg-soft": "var(--app-bg-soft)",
        panel: "var(--app-panel)",
        "panel-soft": "var(--app-panel-soft)",
        border: "var(--app-border)",
        "border-strong": "var(--app-border-strong)",
        text: "var(--app-text)",
        "text-muted": "var(--app-text-muted)",
        "text-subtle": "var(--app-text-subtle)",
        accent: "var(--app-accent)",
        "accent-strong": "var(--app-accent-strong)",
        "accent-soft": "var(--app-accent-soft)",
        success: "var(--app-success)",
        danger: "var(--app-danger)",
      },
    },
  },
  shortcuts: {
    "ui-panel":
      "rounded-xl border border-app-border/90 bg-app-panel/88 text-app-text shadow-[var(--app-shadow-panel)] backdrop-blur-sm",
    "ui-card":
      "rounded-lg border border-app-border/85 bg-app-panel-soft/78 shadow-[var(--app-shadow-card-inset)]",
    "ui-btn-base":
      "cursor-pointer rounded-md border px-2 py-1 text-xs font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/55 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-40",
    "ui-btn-ghost":
      "ui-btn-base border-app-border-strong/80 bg-app-bg/62 text-app-text hover:border-app-accent/70 hover:bg-app-panel-soft/86",
    "ui-btn-danger":
      "ui-btn-base border-app-danger/75 bg-app-danger/14 text-app-text hover:border-app-danger hover:bg-app-danger/24",
    "ui-btn-primary":
      "cursor-pointer rounded-lg border-none bg-app-accent px-3 py-2 text-sm font-medium text-app-bg shadow-[var(--app-shadow-primary-btn)] transition-all duration-200 hover:bg-app-accent-strong disabled:cursor-not-allowed disabled:bg-app-border disabled:text-app-text-muted disabled:shadow-none",
    "ui-section-title": "font-display text-[11px] tracking-[0.08em] text-app-text-subtle uppercase",
    "ui-chip":
      "inline-flex items-center rounded-full border border-app-border bg-app-bg/55 px-2 py-0.5 text-[10px] text-app-text-muted",
    "ui-command-item":
      "truncate rounded border border-app-border/70 bg-app-bg/55 px-2 py-1 text-app-text transition-colors duration-200 hover:border-app-border-strong",
  },
});
