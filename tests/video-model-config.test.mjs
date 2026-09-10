import { test } from 'node:test'
import assert from 'node:assert/strict'
import { validateVideoInput } from '../src/lib/video-model-config.ts'
test('首尾帧少一图应阻止提交', () => {
  assert.match(validateVideoInput({ template: 'first_last', requestFormat: 'json' }, [{ kind: 'image' }]), /2/)
})
test('图片与音频满足对口型要求', () => {
  assert.equal(validateVideoInput({ template: 'lipsync', requestFormat: 'json' }, [{ kind: 'image' }, { kind: 'audio' }]), '')
})
test('文本模型不得静默忽略已有素材', () => {
  assert.match(validateVideoInput({ template: 'text', requestFormat: 'json' }, [{ kind: 'image' }]), /不接受/)
})
test('对口型使用配置的图片数量上限', () => {
  const media = [...Array.from({ length: 3 }, () => ({ kind: 'image' })), { kind: 'audio' }]
  assert.equal(validateVideoInput({ template: 'lipsync', requestFormat: 'json', maxImages: 9 }, media), '')
})
test('有模板的时长必须是正整数，默认上限15秒', () => {
  const config = { template: 'text', requestFormat: 'json' }
  for (const seconds of ['-1', '1.5', '16']) assert.notEqual(validateVideoInput(config, [], seconds), '')
  assert.equal(validateVideoInput(config, [], '15'), '')
  assert.equal(validateVideoInput({ ...config, fixedSeconds: 30 }, [], '30'), '')
})
test('无配置的既有模型保持原行为', () => {
  assert.equal(validateVideoInput(undefined, [{ kind: 'video' }], '-1', 'custom'), '')
})
test('配置模板仅接受受支持的比例，旧模型不受影响', () => {
  assert.match(validateVideoInput({ template: 'text', requestFormat: 'json' }, [], '', '', '4:3'), /比例/)
  assert.equal(validateVideoInput({ template: 'text', requestFormat: 'json' }, [], '', '', '16:9'), '')
  assert.equal(validateVideoInput(undefined, [], '', '', '4:3'), '')
})

test('视频模型选项直接说明名称和素材要求', async () => {
  const { videoModelPresentation } = await import('../src/lib/video-model-config.ts')
  const firstLast = videoModelPresentation('minimax_h3_first_last', { template: 'first_last', requestFormat: 'json' })
  assert.match(firstLast.label, /首尾帧/)
  assert.match(firstLast.description, /2 张图片/)
  const lipsync = videoModelPresentation('minimax_h3_lipsync', { template: 'lipsync', requestFormat: 'json', minImages: 1, maxImages: 9 })
  assert.match(lipsync.description, /1–9 张参考图和 1 段音频/)
  assert.match(videoModelPresentation('minimax_h3_t2v', { template: 'text', requestFormat: 'json' }).description, /仅需提示词/)
  assert.equal(videoModelPresentation('custom-model').label, 'custom-model')
  assert.equal(videoModelPresentation('custom-model').description, undefined)
})
