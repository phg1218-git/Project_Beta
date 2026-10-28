// 아이콘·공유 이미지용 귤 도형 (외부 폰트·이모지 없이 그림)
export function CitrusMark({ size }: { size: number }) {
  return (
    <div style={{ position: 'relative', width: size, height: size, display: 'flex' }}>
      <div style={{ position: 'absolute', left: size * 0.12, top: size * 0.22, width: size * 0.76, height: size * 0.76, borderRadius: '50%', background: '#FF8A00' }} />
      <div style={{ position: 'absolute', left: size * 0.26, top: size * 0.36, width: size * 0.18, height: size * 0.18, borderRadius: '50%', background: '#FFC94A', opacity: 0.6 }} />
      <div style={{ position: 'absolute', left: size * 0.5, top: size * 0.04, width: size * 0.3, height: size * 0.16, borderRadius: '0 100% 0 100%', background: '#3E9B4F' }} />
    </div>
  )
}
