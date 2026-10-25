import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { translate } from '@/i18n/i18n'
import { getAgentLaunchPresets } from '../../../../shared/agent-launch-preset'
import type { TuiAgent } from '../../../../shared/tui-agent'

export function AgentLaunchPresetSelect({
  agent,
  value,
  onValueChange,
  disabled
}: {
  agent: TuiAgent | null
  value: string | null
  onValueChange: (value: string | null) => void
  disabled?: boolean
}): React.JSX.Element | null {
  const presets = agent ? getAgentLaunchPresets(agent) : []
  if (!presets.length) {
    return null
  }
  const label = translate('components.agentLaunchPreset.modelAndEffort', 'Model and effort')
  return (
    <div className="min-w-0 space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <Select
        value={presets.some((p) => p.id === value) ? (value ?? 'default') : 'default'}
        onValueChange={(next) => onValueChange(next === 'default' ? null : next)}
        disabled={disabled}
      >
        <SelectTrigger className="w-full min-w-0" size="sm" aria-label={label}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="default">
            {translate('components.agentLaunchPreset.default', 'Configured default')}
          </SelectItem>
          {presets.map((preset) => (
            <SelectItem key={preset.id} value={preset.id}>
              {preset.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
