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
        // AxleAuto.ai brand palette — cream page with crimson primary.
        axle: {
          bg: "#F5EDDC",             // page cream
          card: "#FBF6E8",           // subtly lighter card fill
          border: "#E4D9BE",         // warm subtle border
          crimson: "#BE1B44",        // primary red
          "crimson-dark": "#9F1638",
          "crimson-light": "#F7DCE3", // soft rose for chips/badges
          text: "#141017",           // near-black
          muted: "#6D6558",          // warm brown-gray
        },
      },
      fontFamily: {
        inter: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        script: ['"Yellowtail"', '"Great Vibes"', "cursive"],
      },
    },
  },
  plugins: [],
};
