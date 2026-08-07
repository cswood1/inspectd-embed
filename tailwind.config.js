/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      // Portal palette — mirrors inspectd-portal's "Inspectd Dark" theme
      // (Slate 900 / Bloomberg style). Applied only inside platform surfaces
      // so external surfaces keep their existing light styling.
      colors: {
        portal: {
          bg: "#0f172a",       // --background: 222 47% 11%
          sidebar: "#0b1220",  // --sidebar-background: 222 47% 9%
          card: "#1e293b",     // --card: 217 33% 17%
          border: "#334155",   // --border: 215 25% 27%
          text: "#f8fafc",     // --foreground: 210 40% 98%
          muted: "#94a3b8",    // --muted-foreground: 215 20% 65%
          emerald: "#13d382",  // --primary: 160 84% 45%
        },
      },
      fontFamily: {
        inter: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
