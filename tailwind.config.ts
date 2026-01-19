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
        'bougu-yellow': '#FEF3C7',
        'bougu-blue': '#DBEAFE',
        'bougu-green': '#D1FAE5',
        'bougu-yellow-dark': '#F59E0B',
        'bougu-blue-dark': '#3B82F6',
        'bougu-green-dark': '#10B981',
      },
    },
  },
  plugins: [],
};
export default config;
