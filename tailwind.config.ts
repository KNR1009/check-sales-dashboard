import type { Config } from "tailwindcss";

/**
 * デジタル庁「ダッシュボードデザインの実践ガイドブック」準拠カラーパレット。
 * 独自色は追加せず、ガイドの HEX を直接登録している。
 */
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Blue（標準・推奨／Positive）
        blue: {
          50: "#D9E6FF",
          200: "#C5D7FB",
          400: "#7096F8",
          600: "#3460FB",
          900: "#0017C1",
          1200: "#000060",
        },
        // Red（警告・Negative）
        danger: {
          50: "#FDEEEE",
          200: "#FFBBBB",
          400: "#FF7171",
          600: "#FE3939",
          900: "#CE0000",
        },
        // Orange（注意・中間）
        warn: {
          50: "#FFEEE2",
          200: "#FFC199",
          400: "#FF8D44",
          600: "#FB5B01",
          900: "#AC3E00",
        },
        // Green（達成・Success）
        ok: {
          50: "#E6F5EC",
          400: "#51B883",
          600: "#259D63",
          900: "#115A36",
        },
        // Solid Gray（中立・テキスト）
        ink: {
          50: "#F2F2F2",
          200: "#CCCCCC",
          400: "#999999",
          536: "#767676",
          700: "#4D4D4D",
          900: "#1A1A1A",
        },
        surface: {
          base: "#F8F8FB",
          control: "#F1F1F4",
        },
        label: "#626264",
      },
      fontFamily: {
        sans: [
          "Inter",
          "Noto Sans JP",
          "-apple-system",
          "BlinkMacSystemFont",
          "Hiragino Sans",
          "Meiryo",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};

export default config;
