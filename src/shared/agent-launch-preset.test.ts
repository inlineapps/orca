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
    expect(getAgentLaunchPresets('codex')).toEqual([])
    expect(getAgentLaunchPresets('gemini')).toEqual([])
    expect(getAgentLaunchPresets('aider')).toEqual([])
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
})
