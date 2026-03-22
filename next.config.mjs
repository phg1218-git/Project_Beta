/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.googleusercontent.com' },
      { protocol: 'https', hostname: '**.kakaocdn.net' },
      // 상품 이미지 업로드 시 사용하는 CDN/스토리지 도메인을 여기에 추가하세요
      // 예: { protocol: 'https', hostname: '**.supabase.co' },
      // 예: { protocol: 'https', hostname: 'res.cloudinary.com' },
    ],
  },
}

export default nextConfig
