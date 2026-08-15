import {
  findCatalogModel,
  findCatalogOption,
  getAgentSessionOptionCatalog
} from './agent-session-option-catalog'
import { resolveTuiAgentLaunchArgs } from './tui-agent-launch-defaults'
import type { TuiAgent } from './tui-agent'

/** One launchable model+effort pair, e.g. Claude Code started on Opus at high effort. */
export type AgentLaunchPreset = {
  id: string
  agent: TuiAgent
  modelId: string
  effort: string
  label: string
}

/** Why: the session-option catalog lists every model an agent's CLI accepts, which
 *  is far more than anyone launches by hand. Curate the pairs worth one click and
 *  leave the rest to Agent settings. */
const CURATED_LAUNCH_PRESETS: Partial<Record<TuiAgent, { models: string[]; efforts: string[] }>> = {
  claude: { models: ['opus', 'fable'], efforts: ['low', 'high'] }
}

function presetId(modelId: string, effort: string): string {
  return `${modelId}:${effort}`
}

export function getAgentLaunchPresets(agent: TuiAgent): AgentLaunchPreset[] {
  const curated = CURATED_LAUNCH_PRESETS[agent]
  const catalog = getAgentSessionOptionCatalog(agent)
  if (!curated || !catalog?.modelApply.launchArgs) {
    return []
  }
  return curated.models.flatMap((modelId) => {
    const model = findCatalogModel(catalog, modelId)
    const effortOption = findCatalogOption(model, 'effort')
    if (!model || effortOption?.kind.type !== 'select') {
      return []
    }
    return curated.efforts.flatMap((effort) => {
      const choice =
        effortOption.kind.type === 'select'
          ? effortOption.kind.choices.find((entry) => entry.value === effort)
          : undefined
      if (!choice) {
        return []
      }
      return [
        {
          id: presetId(modelId, effort),
          agent,
          modelId,
          effort,
          label: `${model.label} · ${choice.label}`
        }
      ]
    })
  })
}

export function findAgentLaunchPreset(
  agent: TuiAgent,
  id: string | null | undefined
): AgentLaunchPreset | null {
  return id ? (getAgentLaunchPresets(agent).find((preset) => preset.id === id) ?? null) : null
}

/** Why: a preset is a one-time launch choice, so it replaces the model and effort
 *  the user's default args already carry rather than stacking a second pair. */
export function applyAgentLaunchPresetArgs(args: {
  agent: TuiAgent
  baseArgs: string
  presetId: string | null | undefined
}): string {
  const preset = findAgentLaunchPreset(args.agent, args.presetId)
  const catalog = preset ? getAgentSessionOptionCatalog(args.agent) : null
  if (!preset || !catalog) {
    return args.baseArgs
  }
  const effortApply = findCatalogOption(findCatalogModel(catalog, preset.modelId), 'effort')?.apply
  // Splitting on whitespace is enough: only option flags are inspected, and the
  // surviving tokens are re-joined verbatim rather than re-quoted.
  const tokens = args.baseArgs.trim() ? args.baseArgs.trim().split(/\s+/) : []
  const withoutModel = catalog.modelApply.removeAgentArgs?.(tokens) ?? tokens
  const kept = effortApply?.removeAgentArgs?.(withoutModel) ?? withoutModel
  return [
    ...kept,
    ...(catalog.modelApply.launchArgs?.(preset.modelId) ?? []),
    ...(effortApply?.launchArgs?.(preset.effort) ?? [])
  ].join(' ')
}

export function resolveTuiAgentLaunchArgsForPreset(args: {
  agent: TuiAgent
  presetId: string | null | undefined
  configuredArgs: Partial<Record<TuiAgent, string>> | null | undefined
}): string {
  return applyAgentLaunchPresetArgs({
    agent: args.agent,
    baseArgs: resolveTuiAgentLaunchArgs(args.agent, args.configuredArgs),
    presetId: args.presetId
  })
}
