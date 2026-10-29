import ExcelJS from 'exceljs'

export const MAX_SHIPPING_ROWS = 1000
export const MAX_SHIPPING_FILE_BYTES = 2 * 1024 * 1024

export interface ShippingSheetRow {
  orderId: string
  itemId: string
  orderedAt: Date
  buyerName: string
  depositorName: string
  productName: string
  quantity: number
  recipientName: string
  recipientPhone: string
  addressBase: string
  addressDetail: string
}

export interface TrackingEntry {
  rowNumber: number
  orderId: string
  itemId: string
  carrier: string
  trackingNumber: string
}

const text = (value: ExcelJS.CellValue): string => {
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number' && Number.isSafeInteger(value)) return String(value)
  return ''
}

export async function buildShippingWorkbook(rows: ShippingSheetRow[]): Promise<Buffer> {
  const book = new ExcelJS.Workbook()
  book.creator = '오늘의귤'
  const list = book.addWorksheet('배송목록', { views: [{ state: 'frozen', ySplit: 1 }] })
  list.columns = [
    { header: '주문번호', key: 'orderId', width: 32 },
    { header: '배송상품ID', key: 'itemId', width: 32 },
    { header: '주문일(KST)', key: 'orderedAt', width: 20 },
    { header: '주문자', key: 'buyerName', width: 16 },
    { header: '입금자', key: 'depositorName', width: 16 },
    { header: '상품', key: 'productName', width: 32 },
    { header: '수량', key: 'quantity', width: 9 },
    { header: '수령인', key: 'recipientName', width: 16 },
    { header: '전화번호', key: 'recipientPhone', width: 20 },
    { header: '기본주소', key: 'addressBase', width: 48 },
    { header: '상세주소', key: 'addressDetail', width: 28 },
  ]
  list.autoFilter = { from: 'A1', to: 'K1' }
  list.getColumn('recipientPhone').numFmt = '@'

  const input = book.addWorksheet('송장입력', { views: [{ state: 'frozen', ySplit: 1 }] })
  input.columns = [
    { header: '주문번호(수정금지)', key: 'orderId', width: 32 },
    { header: '배송상품ID(수정금지)', key: 'itemId', width: 32 },
    { header: '택배사', key: 'carrier', width: 18 },
    { header: '운송장번호(여기에 입력)', key: 'trackingNumber', width: 28 },
    { header: '상품(참고)', key: 'productName', width: 32 },
    { header: '수령인(참고)', key: 'recipientName', width: 16 },
  ]
  input.getColumn('trackingNumber').numFmt = '@'
  input.autoFilter = { from: 'A1', to: 'F1' }

  for (const row of rows) {
    list.addRow({
      ...row,
      orderedAt: new Date(row.orderedAt.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 16).replace('T', ' '),
    })
    input.addRow({
      orderId: row.orderId,
      itemId: row.itemId,
      carrier: 'CJ대한통운',
      trackingNumber: '',
      productName: row.productName,
      recipientName: row.recipientName,
    })
  }
  for (const sheet of [list, input]) {
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF8A00' } }
  }
  const result = await book.xlsx.writeBuffer()
  return Buffer.from(result)
}

export async function parseTrackingWorkbook(buffer: Buffer): Promise<TrackingEntry[]> {
  const book = new ExcelJS.Workbook()
  // ExcelJS가 선언한 Buffer 타입과 이 프로젝트의 Node Buffer 타입 버전이 다르다.
  await book.xlsx.load(buffer as unknown as Parameters<typeof book.xlsx.load>[0])
  const sheet = book.getWorksheet('송장입력')
  if (!sheet || text(sheet.getCell('A1').value) !== '주문번호(수정금지)' ||
      text(sheet.getCell('B1').value) !== '배송상품ID(수정금지)' ||
      text(sheet.getCell('D1').value) !== '운송장번호(여기에 입력)') {
    throw new Error('이 사이트에서 내려받은 배송 엑셀 파일을 사용해주세요.')
  }
  if (sheet.rowCount > MAX_SHIPPING_ROWS + 1) throw new Error('한 번에 최대 1,000행까지 처리할 수 있습니다.')

  const entries: TrackingEntry[] = []
  const seen = new Set<string>()
  for (let number = 2; number <= sheet.rowCount; number++) {
    const row = sheet.getRow(number)
    const trackingNumber = text(row.getCell(4).value).replace(/[ -]/g, '')
    if (!trackingNumber) continue
    const orderId = text(row.getCell(1).value)
    const itemId = text(row.getCell(2).value)
    const carrier = text(row.getCell(3).value) || 'CJ대한통운'
    if (!orderId || !itemId || seen.has(itemId) ||
        carrier.length > 50 || !/^[A-Za-z0-9]{5,40}$/.test(trackingNumber)) {
      throw new Error(`${number}행의 주문번호·배송상품ID·택배사·운송장번호를 확인해주세요.`)
    }
    seen.add(itemId)
    entries.push({ rowNumber: number, orderId, itemId, carrier, trackingNumber })
  }
  if (!entries.length) throw new Error('송장입력 시트에 운송장번호를 하나 이상 입력해주세요.')
  return entries
}
