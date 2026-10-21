import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ecosystemGroups, roadmapPhases } from '../src/data/roadmapV2.ts'

test('roadmap separates internal validation, prototypes, public Beta and direction', () => {
  assert.deepEqual(roadmapPhases.map((phase) => phase.stage), ['internal', 'refining', 'beta', 'direction'])
  const internal = roadmapPhases[0]
  assert.ok(internal.features.every((feature) => feature.label === 'Đã triển khai nội bộ'))
  assert.ok(internal.features.every((feature) => !/Result Store|Antigravity|OpenCode|song song|Pro|Public Beta/.test(feature.title)))
  const beta = roadmapPhases[2]
  assert.match(beta.title, /AI Desk Beta cho Windows/)
  assert.match(beta.status, /Đã phát hành Beta/)
  assert.match(beta.note ?? '', /bộ cài chưa ký số/)
  assert.match(beta.features.flatMap((feature) => feature.details).join(' '), /Không tuyên bố installer hiện tại đã ký số/)
  assert.ok(!/Sắp tới|Chưa có bản công khai|Đang chuẩn bị/.test(JSON.stringify(beta)))
  assert.ok(!/Marketplace|Enterprise|Result Store V2/.test(JSON.stringify(roadmapPhases)))
})

test('future integrations retain research labels and autonomy is not presented as shipped', () => {
  const managers = ecosystemGroups.find((group) => group.id === 'managers')!
  assert.equal(managers.platforms?.find((platform) => platform.name === 'ChatGPT Web')?.status, 'Đang sử dụng')
  assert.ok(managers.platforms?.filter((platform) => platform.name !== 'ChatGPT Web').every((platform) => /Nghiên cứu|Dự kiến/.test(platform.status ?? '')))
  const autonomy = ecosystemGroups.flatMap((group) => group.directions).find((direction) => direction.title === 'Full Autonomous')!
  assert.match(autonomy.description, /chưa phải tính năng đã phát hành/)
  assert.equal(new Set(ecosystemGroups.map((group) => group.id)).size, ecosystemGroups.length)
})
