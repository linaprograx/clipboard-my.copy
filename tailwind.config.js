/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
    { pattern: /border-(amber|blue|indigo|emerald|orange|purple|slate|red)-(400|500|600)/ },
{ pattern: /border-(amber|blue|indigo|emerald|orange|purple|slate|red)-(400|500|600)\/(10|20|30|40|50)/ },
{ pattern: /bg-(amber|blue|indigo|emerald|orange|purple|slate|red)-(400|500|600)/ }, // Added solid support
{ pattern: /bg-(amber|blue|indigo|emerald|orange|purple|slate|red)-(400|500|600)\/(10|20|30|40|90|100)/ },
{ pattern: /text-(amber|blue|indigo|emerald|orange|purple|slate|red)-(400|500|600)/ },
{ pattern: /from-(amber|blue|indigo|emerald|orange|purple|slate|red)-(500|600)\/(5|10|20|30)/ }
  ],
plugins: [],
}
