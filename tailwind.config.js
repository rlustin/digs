/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        accent: "#F97316",
      },
      fontFamily: {
        sans: ["Inter-Regular"],
        "sans-medium": ["Inter-Medium"],
        "sans-semibold": ["Inter-SemiBold"],
        "sans-bold": ["Inter-Bold"],
        mono: ["GeistMono-Regular"],
        "mono-bold": ["GeistMono-Bold"],
        "mono-extrabold": ["GeistMono-ExtraBold"],
      },
    },
  },
  plugins: [],
};
