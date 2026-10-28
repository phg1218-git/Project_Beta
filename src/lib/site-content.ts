import { prisma } from '@/lib/prisma'
export const defaults = {"title": "제주 조천읍,\n입도 1세대의 고집으로 키운\n정직한 귤", "introduction": "화려한 포장과 매끄러운 겉면은 없습니다.\n농약을 줄이고 흙의 힘을 믿는 아버지의 고집스러운 농법은\n비록 투박한 껍질을 남겼지만, 그 속에 가장 건강한 생명력을 채웠습니다.", "storyTitle": "제주 조천읍, 우리 농장 이야기", "story": "조천읍 농장에서 바로 전하는, 꾸밈없는 제주의 맛입니다.\n            \n  필수 농약 외에는 뿌리지 않는 아버지의 고집,\n            \n  그 투박함 속에 가장 건강한 귤이 자랍니다."}
export async function getHomeContent() {
 const rows = await prisma.$queryRaw<{data: typeof defaults}[]>`SELECT data FROM "SiteContent" WHERE id = 'home'`
 return {...defaults,...rows[0]?.data}
}
