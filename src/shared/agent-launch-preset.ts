import {
  findCatalogModel,
  findCatalogOption,
  getAgentSessionOptionCatalog
} from './agent-session-option-catalog'
import {
  removeOverriddenAgentSessionArgs,
  resolveAgentSessionOptionLaunch
} from './agent-session-option-launch'
import { agentArgTerminatorIndex } from './agent-session-option-agent-args'
import {
  quoteStartupArg,
  tokenizeStartupCommand,
  type AgentStartupShell
} from './tui-agent-startup-shell'
import type { TuiAgent } from './tui-agent'

export type AgentLaunchPreset = {
  id: string
  modelId: string
  effort: string
  label: string
}

const MODELS: Partial<Record<TuiAgent, string[]>> = {
  claude: ['opus', 'sonnet', 'fable'],
  codex: ['gpt-6-astra', 'gpt-6.1-sol', 'gpt-6-luna']
}

export function getAgentLaunchPresets(agent: TuiAgent): AgentLaunchPreset[] {
  const catalog = getAgentSessionOptionCatalog(agent)
  if (!catalog) {
    return []
  }
  return (MODELS[agent] ?? []).flatMap((modelId) => {
    const model = findCatalogModel(catalog, modelId)
    const option = findCatalogOption(model, 'effort')
    if (!model || option?.kind.type !== 'select') {
      return []
    }
    const choices = option.kind.choices
    return ['low', 'medium', 'high'].flatMap((effort) => {
      const choice = choices.find((entry) => entry.value === effort)
      return choice
        ? [
            {
              id: `${modelId}:${effort}`,
              modelId,
              effort,
              label: `${model.label} · ${choice.label}`
            }
          ]
        : []
    })
  })
}

export function agentLaunchPresetOptions(
  agent: TuiAgent,
  presetId?: string | null
): Record<string, string> | undefined {
  const preset = getAgentLaunchPresets(agent).find((entry) => entry.id === presetId)
  return preset ? { model: preset.modelId, effort: preset.effort } : undefined
}

export function applyAgentLaunchPresetArgs(args: {
  agent: TuiAgent
  baseArgs: string
  presetId?: string | null
  shell?: AgentStartupShell
}): string {
  const options = agentLaunchPresetOptions(args.agent, args.presetId)
  if (!options) {
    return args.baseArgs
  }
  const shell = args.shell ?? 'posix'
  const parsed = tokenizeStartupCommand(args.baseArgs, shell)
  if (!parsed.ok) {
    return args.baseArgs
  }
  const kept = removeOverriddenAgentSessionArgs(args.agent, options, parsed.tokens)
  const index = agentArgTerminatorIndex(args.agent, kept)
  const selected = resolveAgentSessionOptionLaunch(args.agent, options, [], false).args
  return [...kept.slice(0, index), ...selected, ...kept.slice(index)]
    .map((token) => quoteStartupArg(token, shell))
    .join(' ')
}
