import { describe, expect, it } from 'vitest'
import {
  applyAgentLaunchModelVariantArgs,
  getAgentLaunchModelVariants,
  resolveTuiAgentLaunchArgsForModel
} from './agent-launch-model-variant'

describe('getAgentLaunchModelVariants', () => {
  it('offers the cataloged models for an agent that accepts a model flag', () => {
    expect(getAgentLaunchModelVariants('claude').map((variant) => variant.modelId)).toEqual([
      'fable',
      'opus',
      'sonnet',
      'haiku'
    ])
    expect(getAgentLaunchModelVariants('claude')[1]).toMatchObject({
      modelId: 'opus',
      label: 'Opus'
    })
  })

  it('offers nothing for agents Orca has no model catalog for', () => {
    expect(getAgentLaunchModelVariants('aider')).toEqual([])
    expect(getAgentLaunchModelVariants('goose')).toEqual([])
  })
})

describe('applyAgentLaunchModelVariantArgs', () => {
  it('appends the picked model to the existing launch args', () => {
    expect(
      applyAgentLaunchModelVariantArgs({
        agent: 'claude',
        baseArgs: '--dangerously-skip-permissions',
        modelId: 'opus'
      })
    ).toBe('--dangerously-skip-permissions --model opus')
  })

  it('replaces a model already present in the default args instead of stacking one', () => {
    expect(
      applyAgentLaunchModelVariantArgs({
        agent: 'claude',
        baseArgs: '--model sonnet --verbose',
        modelId: 'fable'
      })
    ).toBe('--verbose --model fable')
  })

  it('leaves tokens after the option terminator untouched', () => {
    expect(
      applyAgentLaunchModelVariantArgs({
        agent: 'claude',
        baseArgs: '--verbose -- --model sonnet',
        modelId: 'haiku'
      })
    ).toBe('--verbose -- --model sonnet --model haiku')
  })

  it('keeps the base args when no model is picked or the agent has no catalog', () => {
    expect(
      applyAgentLaunchModelVariantArgs({
        agent: 'claude',
        baseArgs: '--verbose',
        modelId: null
      })
    ).toBe('--verbose')
    expect(
      applyAgentLaunchModelVariantArgs({
        agent: 'aider',
        baseArgs: '--watch-files',
        modelId: 'opus'
      })
    ).toBe('--watch-files')
  })
})

describe('resolveTuiAgentLaunchArgsForModel', () => {
  it('layers the picked model over the configured per-agent args', () => {
    expect(
      resolveTuiAgentLaunchArgsForModel({
        agent: 'claude',
        modelId: 'fable',
        configuredArgs: { claude: '--verbose' }
      })
    ).toBe('--verbose --model fable')
  })

  it('falls back to the configured args when nothing is picked', () => {
    expect(
      resolveTuiAgentLaunchArgsForModel({
        agent: 'codex',
        modelId: null,
        configuredArgs: { codex: '--search' }
      })
    ).toBe('--search')
  })
})
