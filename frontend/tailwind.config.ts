import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#384795",
        "primary-dark": "#2d3a7a",
        "primary-light": "#eef0fa",
        "primary-light2": "#d4d9f0",
      },
    },
  },
  plugins: [],
};

export default config;
