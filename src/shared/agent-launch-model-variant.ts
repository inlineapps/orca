import { getAgentSessionOptionCatalog } from './agent-session-option-catalog'
import { resolveTuiAgentLaunchArgs } from './tui-agent-launch-defaults'
import type { TuiAgent } from './tui-agent'

/** One launchable model preset for an agent, e.g. Claude Code started on Opus. */
export type AgentLaunchModelVariant = {
  modelId: string
  label: string
  description?: string
}

export function getAgentLaunchModelVariants(agent: TuiAgent): AgentLaunchModelVariant[] {
  const catalog = getAgentSessionOptionCatalog(agent)
  if (!catalog?.modelApply.launchArgs) {
    return []
  }
  return catalog.models.map((model) => ({
    modelId: model.id,
    label: model.label,
    ...(model.description ? { description: model.description } : {})
  }))
}

/** Why: the picked model is a one-time launch choice, so it replaces any model
 *  flag the user's default args already carry rather than stacking a second one. */
export function applyAgentLaunchModelVariantArgs(args: {
  agent: TuiAgent
  baseArgs: string
  modelId: string | null | undefined
}): string {
  const catalog = args.modelId ? getAgentSessionOptionCatalog(args.agent) : null
  const modelArgs = args.modelId ? catalog?.modelApply.launchArgs?.(args.modelId) : null
  if (!modelArgs || modelArgs.length === 0) {
    return args.baseArgs
  }
  // Splitting on whitespace is enough: only option flags are inspected, and the
  // surviving tokens are re-joined verbatim rather than re-quoted.
  const tokens = args.baseArgs.trim() ? args.baseArgs.trim().split(/\s+/) : []
  const kept = catalog?.modelApply.removeAgentArgs?.(tokens) ?? tokens
  return [...kept, ...modelArgs].join(' ')
}

export function resolveTuiAgentLaunchArgsForModel(args: {
  agent: TuiAgent
  modelId: string | null | undefined
  configuredArgs: Partial<Record<TuiAgent, string>> | null | undefined
}): string {
  return applyAgentLaunchModelVariantArgs({
    agent: args.agent,
    baseArgs: resolveTuiAgentLaunchArgs(args.agent, args.configuredArgs),
    modelId: args.modelId
  })
}
