import assert from 'node:assert/strict'
import test from 'node:test'
import { DEMO_STEPS, INITIAL_DEMO_STATE, heroDemoReducer } from '../src/data/heroDemo.ts'
import { HERO_WORKERS, getHeroWorker } from '../src/data/heroWorkers.ts'

test('hero demo progresses through all six steps and completes', () => {
  let state = heroDemoReducer(INITIAL_DEMO_STATE, { type: 'play' })
  assert.equal(state.status, 'running')
  for (let index = 1; index < DEMO_STEPS.length; index += 1) {
    state = heroDemoReducer(state, { type: 'next' })
    assert.equal(state.step, index)
  }
  assert.equal(state.status, 'complete')
  assert.deepEqual(heroDemoReducer(state, { type: 'next' }), state)
})

test('hero demo pause, replay and reset are deterministic', () => {
  const running = heroDemoReducer(INITIAL_DEMO_STATE, { type: 'play' })
  const paused = heroDemoReducer(running, { type: 'pause' })
  assert.equal(paused.status, 'paused')
  const advanced = heroDemoReducer(paused, { type: 'next' })
  assert.equal(advanced.step, 1)
  assert.deepEqual(heroDemoReducer(advanced, { type: 'replay' }), { step: 0, status: 'running' })
  assert.deepEqual(heroDemoReducer(advanced, { type: 'reset' }), INITIAL_DEMO_STATE)
})

test('worker selection data is complete and uses one coordinate system', () => {
  assert.deepEqual(HERO_WORKERS.map((worker) => worker.id), ['manager', 'codex', 'claude', 'result'])
  for (const worker of HERO_WORKERS) {
    assert.equal(getHeroWorker(worker.id), worker)
    assert.match(worker.connectorPath, /^M /)
    assert.ok(worker.position.x > 0 && worker.position.x < 1000)
    assert.ok(worker.position.y > 0 && worker.position.y < 680)
  }
  assert.equal(getHeroWorker(null), null)
})
