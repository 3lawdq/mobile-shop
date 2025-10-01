export default {
  root: true,  // تحديد أن هذا الملف هو الجذر في التكوين
  parser: '@typescript-eslint/parser', // استخدام المحلل الخاص بـ TypeScript
  extends: [
    'eslint:recommended', // قواعد ESLint الموصى بها
    'plugin:@next/next/recommended', // قواعد Next.js الموصى بها
    'plugin:react/recommended', // قواعد React الموصى بها
    'plugin:react-hooks/recommended', // قواعد React hooks الموصى بها
    'plugin:@typescript-eslint/recommended', // قواعد TypeScript الموصى بها
    'prettier', // استخدام Prettier للتنسيق التلقائي
  ],
  parserOptions: {
    ecmaVersion: 2020, // استخدام ECMAScript 2020
    sourceType: 'module', // تمكين استخدام `import` و `export`
  },
  settings: {
    react: {
      version: 'detect', // يتم اكتشاف النسخة تلقائيًا
    },
  },
  rules: {
    // قواعد مخصصة للمشروع
    'react/prop-types': 'off', // تعطيل Prop-types لأننا نستخدم TypeScript
    'no-unused-vars': 'warn', // تحذير عند وجود متغيرات غير مستخدمة
    'react/react-in-jsx-scope': 'off', // تعطيل قاعدة `react-in-jsx-scope` لأن Next.js يقوم بذلك تلقائيًا
    '@typescript-eslint/no-unused-vars': 'warn', // تحذير عند وجود متغيرات غير مستخدمة في TypeScript
    '@typescript-eslint/explicit-module-boundary-types': 'off', // تعطيل قاعدة "أنواع الحدود في الوحدات" لأننا نستخدم TypeScript
    'prettier/prettier': ['error', { singleQuote: true, trailingComma: 'es5' }], // تنسيق الكود باستخدام Prettier
  },
};
