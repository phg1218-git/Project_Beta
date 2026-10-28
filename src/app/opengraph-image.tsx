import { ImageResponse } from 'next/og'
import { CitrusMark } from './citrus-mark'

// 공유 미리보기 이미지. 기본 폰트에 한글이 없어 문구는 영문으로만 표기
export const alt = '오늘의귤 — 제주 조천읍 감귤 농장'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 56,
        background: 'linear-gradient(135deg, #FF8A00 0%, #FFC94A 100%)' }}>
        <div style={{ display: 'flex', background: '#FFF8EE', borderRadius: '50%', padding: 30 }}>
          <CitrusMark size={260} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', color: 'white' }}>
          <div style={{ fontSize: 92, fontWeight: 800 }}>dailycitrus</div>
          <div style={{ fontSize: 40, opacity: 0.92 }}>Jocheon, Jeju · Family citrus farm</div>
        </div>
      </div>
    ),
    size,
  )
}
