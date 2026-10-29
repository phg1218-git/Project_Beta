import test from 'node:test'
import assert from 'node:assert/strict'
import ExcelJS from 'exceljs'
import { buildShippingWorkbook, parseTrackingWorkbook } from '../src/lib/shipping-sheet'

const sample = {
  orderId: 'order-123',
  itemId: 'item-123',
  orderedAt: new Date('2026-10-28T23:00:00Z'),
  buyerName: '주문자',
  depositorName: '입금자',
  productName: '감귤 5kg',
  quantity: 2,
  recipientName: '수령인',
  recipientPhone: '010-0123-4567',
  addressBase: '제주시 조천읍',
  addressDetail: '101호',
}

test('배송 엑셀에 수령 정보와 입력 시트를 만들고 운송장 앞의 0을 보존', async () => {
  const buffer = await buildShippingWorkbook([sample])
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer as unknown as Parameters<typeof workbook.xlsx.load>[0])
  const list = workbook.getWorksheet('배송목록')!
  const input = workbook.getWorksheet('송장입력')!
  assert.equal(list.getCell('I2').value, '010-0123-4567')
  assert.equal(list.getCell('C2').value, '2026-10-29 08:00')
  assert.equal(input.getCell('C2').value, 'CJ대한통운')
  assert.equal(input.getCell('D2').numFmt, '@')
  input.getCell('D2').value = '001234567890'
  const filled = Buffer.from(await workbook.xlsx.writeBuffer())
  const entries = await parseTrackingWorkbook(filled)
  assert.deepEqual(entries, [{
    rowNumber: 2, orderId: sample.orderId, itemId: sample.itemId,
    carrier: 'CJ대한통운', trackingNumber: '001234567890',
  }])
})

test('송장 없는 파일, 잘못된 번호, 중복 배송상품ID는 거부', async () => {
  const buffer = await buildShippingWorkbook([sample, { ...sample, itemId: 'item-456' }])
  await assert.rejects(parseTrackingWorkbook(buffer), /하나 이상/)
  const book = new ExcelJS.Workbook()
  await book.xlsx.load(buffer as unknown as Parameters<typeof book.xlsx.load>[0])
  const input = book.getWorksheet('송장입력')!
  input.getCell('D2').value = '123'
  await assert.rejects(parseTrackingWorkbook(Buffer.from(await book.xlsx.writeBuffer())), /2행/)
  input.getCell('D2').value = '123456789012'
  input.getCell('B3').value = sample.itemId
  input.getCell('D3').value = '987654321098'
  await assert.rejects(parseTrackingWorkbook(Buffer.from(await book.xlsx.writeBuffer())), /3행/)
})
