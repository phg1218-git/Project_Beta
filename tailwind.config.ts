import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary:   '#FF8A00',
        secondary: '#FFC94A',
        accent:    '#6BAF5E',
        bg:        '#FFF8EE',
        // 브랜드 오렌지 하나로 통일: 기존 orange-500/600 사용처가 모두 브랜드 색을 따름
        orange: {
          500: '#FF8A00',
          600: '#EB7A00',
          700: '#C96400',
        },
      },
      fontFamily: {
        sans: ['Pretendard', 'Apple SD Gothic Neo', 'sans-serif'],
        serif: ['Noto Serif KR', 'serif'],
      },
      borderRadius: {
        card: '16px',
      },
    },
  },
  plugins: [],
}

export default config
