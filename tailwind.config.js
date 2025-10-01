// tailwind.config.js

module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx}',  // تأكد من أن المسارات محدثة حسب هيكل مشروعك
    './components/**/*.{js,ts,jsx,tsx}',
    './app/**/*.{js,ts,jsx,tsx}',    // تأكد من تضمين مجلد app
  ],
  theme: {
    extend: {
      colors: {
        primary: '#ee7103',
        secondary: '#f3f4f6',
        accent: '#1d4ed8',
      },
      fontFamily: {
        cairo: ['Cairo', 'sans-serif'], // خط "Cairo"
        sans: ['Inter', 'sans-serif'],   // خط "Inter"
      },
    },
  },
  plugins: [],
}
