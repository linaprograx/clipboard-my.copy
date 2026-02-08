/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  safelist: [
    { pattern: /border-(amber|indigo|emerald|orange|slate|red)-(400|500|600)/ },
    { pattern: /border-(amber|indigo|emerald|orange|slate|red)-(400|500|600)\/(10|20|30|40|50)/ },
    { pattern: /bg-(amber|indigo|emerald|orange|slate|red)-(400|500|600)\/(10|20|30|40)/ },
    { pattern: /text-(amber|indigo|emerald|orange|slate|red)-(400|500|600)/ },
    { pattern: /from-(amber|indigo|emerald|orange|slate|red)-(500|600)\/(5|10|20|30)/ }
  ],
  plugins: [],
}
