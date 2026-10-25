import { describe, expect, it } from 'vitest'
import { applyAgentLaunchPresetArgs, getAgentLaunchPresets } from './agent-launch-preset'
import { tokenizeStartupCommand } from './tui-agent-startup-shell'

describe('agent launch presets', () => {
  it('offers Claude and Codex model and effort pairs', () => {
    expect(getAgentLaunchPresets('claude').map((p) => p.id)).toContain('sonnet:medium')
    expect(getAgentLaunchPresets('claude').map((p) => p.id)).toContain('fable:high')
    expect(getAgentLaunchPresets('codex').map((p) => p.id)).toContain('gpt-6.1-sol:low')
    expect(getAgentLaunchPresets('gemini')).toEqual([])
  })

  it('replaces Claude flags without changing quoted operands or text after --', () => {
    const actual = applyAgentLaunchPresetArgs({
      agent: 'claude',
      presetId: 'opus:medium',
      baseArgs: '--add-dir "my docs" --model sonnet --effort high -- --model literal'
    })
    expect(tokenizeStartupCommand(actual, 'posix')).toMatchObject({
      ok: true,
      tokens: [
        '--add-dir',
        'my docs',
        '--model',
        'opus',
        '--effort',
        'medium',
        '--',
        '--model',
        'literal'
      ]
    })
  })

  it('replaces Codex overrides and preserves unrelated config', () => {
    const actual = applyAgentLaunchPresetArgs({
      agent: 'codex',
      presetId: 'gpt-6-astra:high',
      baseArgs: '-m older -c model_reasoning_effort=low -c profile=review'
    })
    expect(tokenizeStartupCommand(actual, 'posix')).toMatchObject({
      ok: true,
      tokens: ['-c', 'profile=review', '-m', 'gpt-6-astra', '-c', 'model_reasoning_effort=high']
    })
  })

  it('quotes Windows paths using the target shell', () => {
    const actual = applyAgentLaunchPresetArgs({
      agent: 'claude',
      presetId: 'fable:low',
      shell: 'powershell',
      baseArgs: '--add-dir "C:\\my docs" --model opus'
    })
    expect(tokenizeStartupCommand(actual, 'powershell')).toMatchObject({
      ok: true,
      tokens: ['--add-dir', 'C:\\my docs', '--model', 'fable', '--effort', 'low']
    })
  })

  it('leaves defaults unchanged without a valid pick', () => {
    expect(
      applyAgentLaunchPresetArgs({ agent: 'codex', presetId: 'opus:high', baseArgs: '--search' })
    ).toBe('--search')
  })
})
