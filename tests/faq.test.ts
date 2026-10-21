import { test } from 'node:test'
import assert from 'node:assert/strict'
import { FAQS, normalizeFaqSearch, searchFaqs } from '../src/data/faq.ts'

test('approved FAQ reflects public Beta, provider permissions and an unannounced Pro', () => {
  assert.equal(FAQS.length, 9)
  assert.equal(new Set(FAQS.map(({ id }) => id)).size, 9)
  const answer = (id: string) => FAQS.find((faq) => faq.id === id)!.paragraphs.join(' ')
  assert.match(answer('download'), /AI Desk 0\.3\.0 Beta là phiên bản công khai duy nhất/)
  assert.match(answer('download'), /chưa được ký số hoặc chứng nhận bảo mật độc lập/)
  assert.match(answer('setup'), /Prompt Library đã có trên website/)
  assert.match(answer('account'), /không cần tạo tài khoản AI Desk/)
  assert.match(answer('account'), /quyền truy cập hợp lệ/)
  assert.match(answer('cost'), /Giá, quyền lợi và thời điểm phát hành Pro chưa được công bố chính thức/)
  assert.match(answer('permissions'), /Tùy chế độ hoạt động, một số hành động có thể cần/)
  assert.match(answer('privacy'), /chính sách riêng của từng nhà cung cấp/)
  assert.match(answer('platforms'), /macOS hoặc Linux chưa có bản phát hành được xác nhận/)
  const text = FAQS.flatMap(({ paragraphs }) => paragraphs).join(' ')
  assert.doesNotMatch(text, /sẽ mở tải khi|Chưa có bản công khai|Hướng dẫn chi tiết sẽ được công bố|an toàn 100%|không có dữ liệu nào được gửi ra ngoài|mã hóa đầu cuối toàn bộ|tất cả hành động đều phải xác nhận/)
})

test('FAQ links point to the existing download, setup, prompts and privacy routes', () => {
  assert.deepEqual(FAQS.flatMap((faq) => faq.links ?? []).map(({ href }) => href), ['/download', '/install', '/prompts', '/privacy'])
  for (const faq of FAQS) {
    for (const link of faq.links ?? []) assert.ok(faq.paragraphs.some((paragraph) => paragraph.includes(link.text)), `${faq.id}: link text must exist in approved copy`)
  }
})

test('FAQ search supports Vietnamese case, accents, answer text and empty results', () => {
  assert.equal(normalizeFaqSearch('  ĐIỀU PHỐI  '), 'dieu phoi')
  assert.deepEqual(searchFaqs('tài khoản'), searchFaqs('TAI KHOAN'))
  assert.ok(searchFaqs('TAI KHOAN').some(({ id }) => id === 'account'))
  assert.deepEqual(searchFaqs('dữ liệu'), searchFaqs('DU LIEU'))
  assert.ok(searchFaqs('DU LIEU').some(({ id }) => id === 'privacy'))
  assert.deepEqual(searchFaqs('SHA-256').map(({ id }) => id), ['download'])
  assert.ok(searchFaqs('ky so').some(({ id }) => id === 'download'))
  assert.deepEqual(searchFaqs('   '), FAQS)
  assert.deepEqual(searchFaqs('khong-ton-tai-xyz987'), [])
})
