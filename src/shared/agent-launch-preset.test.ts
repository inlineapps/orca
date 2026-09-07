import { describe, expect, it } from 'vitest'
import { getAgentLaunchPresets, resolveTuiAgentLaunchArgsForPreset } from './agent-launch-preset'

describe('getAgentLaunchPresets', () => {
  it('offers only the curated Claude model/effort pairs', () => {
    expect(getAgentLaunchPresets('claude')).toEqual([
      { id: 'opus:low', agent: 'claude', modelId: 'opus', effort: 'low', label: 'Opus · Low' },
      { id: 'opus:high', agent: 'claude', modelId: 'opus', effort: 'high', label: 'Opus · High' },
      { id: 'fable:low', agent: 'claude', modelId: 'fable', effort: 'low', label: 'Fable · Low' },
      { id: 'fable:high', agent: 'claude', modelId: 'fable', effort: 'high', label: 'Fable · High' }
    ])
  })

  it('offers nothing for agents outside the curated set', () => {
    expect(getAgentLaunchPresets('gemini')).toEqual([])
    expect(getAgentLaunchPresets('aider')).toEqual([])
  })

  it('offers the curated Codex model/effort pairs', () => {
    expect(getAgentLaunchPresets('codex')).toEqual([
      {
        id: 'gpt-5.6-luna:high',
        agent: 'codex',
        modelId: 'gpt-5.6-luna',
        effort: 'high',
        label: 'GPT-5.6 Luna · High'
      },
      {
        id: 'gpt-5.6-luna:medium',
        agent: 'codex',
        modelId: 'gpt-5.6-luna',
        effort: 'medium',
        label: 'GPT-5.6 Luna · Medium'
      },
      {
        id: 'gpt-5.6-luna:low',
        agent: 'codex',
        modelId: 'gpt-5.6-luna',
        effort: 'low',
        label: 'GPT-5.6 Luna · Low'
      },
      {
        id: 'gpt-5.6-sol:high',
        agent: 'codex',
        modelId: 'gpt-5.6-sol',
        effort: 'high',
        label: 'GPT-5.6 Sol · High'
      },
      {
        id: 'gpt-5.6-sol:medium',
        agent: 'codex',
        modelId: 'gpt-5.6-sol',
        effort: 'medium',
        label: 'GPT-5.6 Sol · Medium'
      },
      {
        id: 'gpt-5.6-sol:low',
        agent: 'codex',
        modelId: 'gpt-5.6-sol',
        effort: 'low',
        label: 'GPT-5.6 Sol · Low'
      },
      {
        id: 'gpt-6-astra:high',
        agent: 'codex',
        modelId: 'gpt-6-astra',
        effort: 'high',
        label: 'GPT-6 Astra · High'
      },
      {
        id: 'gpt-6-astra:medium',
        agent: 'codex',
        modelId: 'gpt-6-astra',
        effort: 'medium',
        label: 'GPT-6 Astra · Medium'
      },
      {
        id: 'gpt-6-astra:low',
        agent: 'codex',
        modelId: 'gpt-6-astra',
        effort: 'low',
        label: 'GPT-6 Astra · Low'
      }
    ])
  })
})

describe('resolveTuiAgentLaunchArgsForPreset', () => {
  it('appends the preset model and effort to the configured args', () => {
    expect(
      resolveTuiAgentLaunchArgsForPreset({
        agent: 'claude',
        presetId: 'fable:high',
        configuredArgs: { claude: '--dangerously-skip-permissions' }
      })
    ).toBe('--dangerously-skip-permissions --model fable --effort high')
  })

  it('replaces a model and effort the configured args already carry', () => {
    expect(
      resolveTuiAgentLaunchArgsForPreset({
        agent: 'claude',
        presetId: 'opus:low',
        configuredArgs: { claude: '--model sonnet --verbose --effort max' }
      })
    ).toBe('--verbose --model opus --effort low')
  })

  it('leaves tokens after the option terminator untouched', () => {
    expect(
      resolveTuiAgentLaunchArgsForPreset({
        agent: 'claude',
        presetId: 'opus:high',
        configuredArgs: { claude: '--verbose -- --model sonnet' }
      })
    ).toBe('--verbose -- --model sonnet --model opus --effort high')
  })

  it('falls back to the configured args for no preset, an unknown preset, or another agent', () => {
    expect(
      resolveTuiAgentLaunchArgsForPreset({
        agent: 'claude',
        presetId: null,
        configuredArgs: { claude: '--verbose' }
      })
    ).toBe('--verbose')
    expect(
      resolveTuiAgentLaunchArgsForPreset({
        agent: 'claude',
        presetId: 'haiku:medium',
        configuredArgs: { claude: '--verbose' }
      })
    ).toBe('--verbose')
    expect(
      resolveTuiAgentLaunchArgsForPreset({
        agent: 'codex',
        presetId: 'opus:high',
        configuredArgs: { codex: '--search' }
      })
    ).toBe('--search')
  })

  it.each([
    ['gpt-5.6-sol', 'high'],
    ['gpt-6-astra', 'medium'],
    ['gpt-5.6-luna', 'low']
  ])('resolves %s with model and reasoning effort flags', (modelId, effort) => {
    expect(
      resolveTuiAgentLaunchArgsForPreset({
        agent: 'codex',
        presetId: `${modelId}:${effort}`,
        configuredArgs: { codex: '--profile review -m gpt-5.5 -c model_reasoning_effort=low' }
      })
    ).toBe(`--profile review -m ${modelId} -c model_reasoning_effort=${effort}`)
  })
})
