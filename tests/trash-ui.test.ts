// Studio Trash client helpers: Vietnamese messages, shared confirmation phrase.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { PURGE_PHRASE, RESOURCE, TrashError, describeTrashError } from '../src/lib/trashApi.ts'
import { PURGE_CONFIRMATION } from '../server/cms/trash.ts'

test('TRASH-UI-01 the client and server agree on the typed confirmation phrase', () => {
  assert.equal(PURGE_PHRASE, PURGE_CONFIRMATION)
  assert.equal(PURGE_PHRASE, 'XOA VINH VIEN')
})

test('TRASH-UI-02 every server error code that can reach the owner has an actionable Vietnamese message', () => {
  for (const code of ['version_conflict', 'not_found', 'slug_conflict', 'page_protected', 'permanent_delete_disabled', 'has_comments', 'not_in_trash', 'confirmation_required', 'slug_confirmation_mismatch', 'purge_blocked', 'rate_limited', 'csrf_invalid', 'origin_forbidden', 'authentication_required']) {
    const text = describeTrashError(new TrashError(409, code))
    assert.ok(/[À-ỹ]/.test(text), `${code} message must be Vietnamese: ${text}`)
    assert.ok(!text.includes(code), `${code} must not leak the raw code`)
  }
  assert.match(describeTrashError(new TrashError(409, 'slug_conflict', 'bai-2')), /bai-2/)
  assert.match(describeTrashError(new Error('network')), /Lỗi mạng/)
})

test('TRASH-UI-03 trash is requested through the same resources as the editors', () => {
  assert.deepEqual(RESOURCE, { article: 'articles', guide: 'guides', video: 'videos', app: 'apps' })
})
