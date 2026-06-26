import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "1rem",
      screens: {
        "2xl": "1280px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        bull: {
          50: "#f0fdf4",
          100: "#dcfce7",
          500: "#22c55e",
          600: "#16a34a",
          700: "#15803d",
        },
        bear: {
          50: "#fef2f2",
          100: "#fee2e2",
          500: "#ef4444",
          600: "#dc2626",
          700: "#b91c1c",
        },
        neutral: {
          50: "#fafafa",
          100: "#f5f5f5",
          500: "#737373",
          700: "#404040",
        },
        // iOS 18 system colors
        "ios-blue": "#007AFF",
        "ios-green": "#34C759",
        "ios-red": "#FF3B30",
        "ios-orange": "#FF9500",
        "ios-purple": "#AF52DE",
        "ios-gray": {
          1: "#8E8E93",
          2: "#636366",
          3: "#48484A",
          4: "#3A3A3C",
          5: "#2C2C2E",
          6: "#1C1C1E",
        },
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
        "2xl": "var(--radius-2xl)",
      },
      fontFamily: {
        sans: [
          "SF Pro Text",
          "-apple-system",
          "BlinkMacSystemFont",
          "SF Pro Display",
          "Inter",
          "system-ui",
          "sans-serif",
        ],
        display: [
          "SF Pro Display",
          "-apple-system",
          "BlinkMacSystemFont",
          "Inter",
          "system-ui",
          "sans-serif",
        ],
        mono: [
          "SF Mono",
          "ui-monospace",
          "JetBrains Mono",
          "Menlo",
          "Consolas",
          "monospace",
        ],
        num: [
          "SF Pro Display",
          "Inter",
          "system-ui",
          "sans-serif",
        ],
      },
      fontSize: {
        // Apple HIG typography scale
        "display-lg": ["2.75rem", { lineHeight: "1.1", letterSpacing: "-0.028em", fontWeight: "700" }],
        "display": ["2.25rem", { lineHeight: "1.15", letterSpacing: "-0.026em", fontWeight: "700" }],
        "title-1": ["1.75rem", { lineHeight: "1.2", letterSpacing: "-0.022em", fontWeight: "700" }],
        "title-2": ["1.375rem", { lineHeight: "1.25", letterSpacing: "-0.02em", fontWeight: "600" }],
        "title-3": ["1.125rem", { lineHeight: "1.3", letterSpacing: "-0.018em", fontWeight: "600" }],
        "body": ["0.9375rem", { lineHeight: "1.5", letterSpacing: "-0.011em" }],
        "callout": ["1rem", { lineHeight: "1.45", letterSpacing: "-0.015em" }],
        "subhead": ["0.8125rem", { lineHeight: "1.4", letterSpacing: "-0.008em" }],
        "footnote": ["0.75rem", { lineHeight: "1.4", letterSpacing: "-0.004em" }],
        "caption-1": ["0.6875rem", { lineHeight: "1.35", letterSpacing: "0" }],
        "caption-2": ["0.625rem", { lineHeight: "1.3", letterSpacing: "0.02em" }],
      },
      transitionTimingFunction: {
        spring: "cubic-bezier(0.32, 0.72, 0, 1)",
        smooth: "cubic-bezier(0.4, 0, 0.2, 1)",
        decel: "cubic-bezier(0, 0, 0.2, 1)",
        accel: "cubic-bezier(0.4, 0, 1, 1)",
      },
      transitionDuration: {
        instant: "100ms",
        fast: "180ms",
        base: "280ms",
        slow: "420ms",
      },
      boxShadow: {
        // iOS-style layered shadows — subtle, not heavy
        xs: "0 1px 2px hsl(222 25% 11% / 0.04)",
        sm: "0 1px 2px hsl(222 25% 11% / 0.04), 0 2px 4px hsl(222 25% 11% / 0.04)",
        DEFAULT:
          "0 1px 2px hsl(222 25% 11% / 0.05), 0 4px 12px hsl(222 25% 11% / 0.06)",
        md: "0 2px 4px hsl(222 25% 11% / 0.05), 0 8px 20px hsl(222 25% 11% / 0.07)",
        lg: "0 4px 8px hsl(222 25% 11% / 0.06), 0 16px 32px hsl(222 25% 11% / 0.08)",
        xl: "0 8px 16px hsl(222 25% 11% / 0.08), 0 24px 48px hsl(222 25% 11% / 0.10)",
        "inner-border": "inset 0 0 0 1px hsl(var(--border))",
      },
      keyframes: {
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        slideUp: {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        slideDown: {
          from: { opacity: "0", transform: "translateY(-10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        scaleIn: {
          from: { opacity: "0", transform: "scale(0.96)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        pulseSoft: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.55" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        pullRefresh: {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        scrollReveal: {
          from: { opacity: "0", transform: "translateY(16px) scale(0.985)" },
          to: { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        cardLift: {
          from: { transform: "translateY(0)", boxShadow: "0 1px 2px hsl(222 25% 11% / 0.04)" },
          to: { transform: "translateY(-2px)", boxShadow: "0 4px 16px hsl(222 25% 11% / 0.08), 0 1px 3px hsl(222 25% 11% / 0.06)" },
        },
        slideInRight: {
          from: { opacity: "0", transform: "translateX(12px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        pageOverlayIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        pressScale: {
          from: { transform: "scale(1)" },
          to: { transform: "scale(0.97)" },
        },
        priceFlash: {
          "0%": { backgroundColor: "hsl(var(--primary) / 0.12)" },
          "100%": { backgroundColor: "transparent" },
        },
      },
      animation: {
        "fade-in": "fadeIn 0.28s cubic-bezier(0.32, 0.72, 0, 1) both",
        "slide-up": "slideUp 0.28s cubic-bezier(0.32, 0.72, 0, 1) both",
        "slide-down": "slideDown 0.28s cubic-bezier(0.32, 0.72, 0, 1) both",
        "scale-in": "scaleIn 0.24s cubic-bezier(0.32, 0.72, 0, 1) both",
        "pulse-soft": "pulseSoft 2.4s ease-in-out infinite",
        "shimmer": "shimmer 1.6s ease-in-out infinite",
        "pull-refresh": "pullRefresh 0.8s linear infinite",
        "scroll-reveal": "scrollReveal 0.42s cubic-bezier(0.32, 0.72, 0, 1) both",
        "card-lift": "cardLift 0.28s cubic-bezier(0.32, 0.72, 0, 1) both",
        "slide-in-right": "slideInRight 0.35s cubic-bezier(0.32, 0.72, 0, 1) both",
        "page-overlay": "pageOverlayIn 0.2s ease-out both",
        "press-scale": "pressScale 0.1s cubic-bezier(0.32, 0.72, 0, 1) both",
        "price-flash": "priceFlash 0.6s ease-out both",
      },
      backdropBlur: {
        xs: "4px",
      },
    },
  },
  plugins: [],
};

export default config;
