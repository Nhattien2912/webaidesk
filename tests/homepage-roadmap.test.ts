import { test } from 'node:test'
import assert from 'node:assert/strict'
import { homepageRoadmap } from '../src/data/homepageRoadmap.ts'
import { roadmapPhases } from '../src/data/roadmapV2.ts'

test('homepage phase identity and release states stay aligned with the approved full roadmap', () => {
  assert.deepEqual(homepageRoadmap.map(({id, number, title, stage}) => ({id, number, title, stage})), roadmapPhases.map(({id, number, title, stage}) => ({id, number, title, stage})))
  for (const phase of homepageRoadmap) {
    const source = roadmapPhases.find(({id}) => id === phase.id)!
    assert.equal(phase.status, source.stage === 'refining' ? source.status.replace('nguyên mẫu hoạt động', 'nguyên mẫu') : source.status)
  }
  assert.match(homepageRoadmap.find(({stage}) => stage === 'beta')!.status, /Đã phát hành Beta/)
  assert.match(homepageRoadmap.find(({stage}) => stage === 'refining')!.note ?? '', /không đồng nghĩa tất cả đã có trong Beta/)
  assert.match(homepageRoadmap.find(({stage}) => stage === 'direction')!.note ?? '', /chưa phải tính năng đã phát hành/)
  assert.ok(!/Chưa có bản công khai|Free Public Beta sắp ra mắt|Bộ cài có chữ ký số/.test(JSON.stringify(homepageRoadmap)))
})
