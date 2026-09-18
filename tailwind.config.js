/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        agc: {
          navy: "#071B34",
          dark: "#0B1F3A",
          orange: "#F97316",
          bg: "#F5F7FA",
          card: "#FFFFFF",
          border: "#E5E7EB",
          text: "#1F2937",
        },
        navy: {
          50: "#F5F7FA",
          100: "#E5E7EB",
          300: "#94A3B8",
          500: "#64748B",
          600: "#475569",
          800: "#0B1F3A",
          900: "#071B34",
        },
      },
      boxShadow: {
        card: "0 8px 24px rgba(7, 27, 52, 0.06)",
        "card-lg": "0 16px 40px rgba(7, 27, 52, 0.10)",
      },
      borderRadius: {
        agc: "18px",
      },
    },
  },
  plugins: [],
};
