import {
  Copy,
  FileJson,
  FolderOpen,
  LocateFixed,
  MessageSquarePlus,
  PanelTopOpen,
  Play,
  Trash2
} from 'lucide-react'
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger
} from '@/components/ui/dropdown-menu'
import {
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger
} from '@/components/ui/context-menu'
import type { AgentLaunchModelVariant } from '../../../../shared/agent-launch-model-variant'

const NO_MODEL_VARIANTS: readonly AgentLaunchModelVariant[] = []
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { translate } from '@/i18n/i18n'

export function SessionActionMenuItems({
  menuKind = 'dropdown',
  resumeDisabled,
  resumeLabel,
  onResume,
  resumeModelVariants = NO_MODEL_VARIANTS,
  onResumeWithModel,
  onContinueInNewSession,
  onJumpToOriginalPane,
  showJumpToWorktree,
  onJumpToWorktree,
  onCopyResume,
  onCopyId,
  onCopyPath,
  onOpenLog,
  onRevealLog,
  onOpenCwd,
  deleteBlockedReason,
  onDelete
}: {
  menuKind?: 'dropdown' | 'context'
  resumeDisabled: boolean
  resumeLabel: string
  onResume: () => void
  /** Model presets the session's agent can be resumed on; empty hides the submenu. */
  resumeModelVariants?: readonly AgentLaunchModelVariant[]
  onResumeWithModel?: (modelId: string) => void
  onContinueInNewSession?: () => void
  onJumpToOriginalPane?: () => void
  showJumpToWorktree: boolean
  onJumpToWorktree?: () => void
  // Absent for zero-turn sessions: copying a resume command that lands in an
  // empty conversation would contradict the "not saved" state.
  onCopyResume?: () => void
  onCopyId: () => void
  onCopyPath: () => void
  onOpenLog?: () => void
  onRevealLog?: () => void
  onOpenCwd?: () => void
  // Null when Delete is offered; otherwise the tooltip explaining why it isn't.
  deleteBlockedReason: string | null
  onDelete: () => void
}) {
  const Item = menuKind === 'context' ? ContextMenuItem : DropdownMenuItem
  const Separator = menuKind === 'context' ? ContextMenuSeparator : DropdownMenuSeparator
  const Sub = menuKind === 'context' ? ContextMenuSub : DropdownMenuSub
  const SubTrigger = menuKind === 'context' ? ContextMenuSubTrigger : DropdownMenuSubTrigger
  const SubContent = menuKind === 'context' ? ContextMenuSubContent : DropdownMenuSubContent
  const hasLocalPathActions = Boolean(onOpenLog || onRevealLog || onOpenCwd)
  const deleteLabel = translate('auto.components.right.sidebar.AiVaultSessionRow.delete', 'Delete')
  const deleteItem = (
    <Item
      variant="destructive"
      disabled={Boolean(deleteBlockedReason)}
      onSelect={deleteBlockedReason ? undefined : onDelete}
      // Also on aria-label, so a screen-reader user hears why Delete is
      // disabled rather than only that it is.
      aria-label={deleteBlockedReason ? `${deleteLabel}. ${deleteBlockedReason}` : undefined}
    >
      <Trash2 className="size-3.5" />
      {deleteLabel}
    </Item>
  )

  return (
    <>
      {onJumpToOriginalPane ? (
        <Item onSelect={onJumpToOriginalPane}>
          <LocateFixed className="size-3.5" />
          {translate(
            'auto.components.right.sidebar.AiVaultSessionRow.jumpToOriginalPane',
            'Jump to Original Pane'
          )}
        </Item>
      ) : null}
      {showJumpToWorktree ? (
        <Item disabled={!onJumpToWorktree} onSelect={onJumpToWorktree}>
          <PanelTopOpen className="size-3.5" />
          {translate(
            'auto.components.right.sidebar.AiVaultSessionRow.jumpToWorktree',
            'Jump to Worktree'
          )}
        </Item>
      ) : null}
      <Item disabled={resumeDisabled} onSelect={onResume}>
        <Play className="size-3.5" />
        {resumeLabel}
      </Item>
      {onResumeWithModel && resumeModelVariants.length > 0 ? (
        <Sub>
          <SubTrigger disabled={resumeDisabled}>
            <Play className="size-3.5" />
            {translate('components.aiVault.resumeOnModel', 'Resume on Model')}
          </SubTrigger>
          <SubContent>
            {resumeModelVariants.map((variant) => (
              <Item key={variant.modelId} onSelect={() => onResumeWithModel(variant.modelId)}>
                {variant.label}
              </Item>
            ))}
          </SubContent>
        </Sub>
      ) : null}
      {onContinueInNewSession ? (
        <Item onSelect={onContinueInNewSession}>
          <MessageSquarePlus className="size-3.5" />
          {translate(
            'components.agentSessionContinuation.continueInNewSession',
            'Continue in New Session…'
          )}
        </Item>
      ) : null}
      {onCopyResume ? (
        <Item onSelect={onCopyResume}>
          <Copy className="size-3.5" />
          {translate(
            'auto.components.right.sidebar.AiVaultSessionRow.copyResumeCommand',
            'Copy Resume Command'
          )}
        </Item>
      ) : null}
      {hasLocalPathActions ? (
        <>
          <Separator />
          {onOpenLog ? (
            <Item onSelect={onOpenLog}>
              <FileJson className="size-3.5" />
              {translate('auto.components.right.sidebar.AiVaultSessionRow.openLog', 'Open Log')}
            </Item>
          ) : null}
          {onRevealLog ? (
            <Item onSelect={onRevealLog}>
              <FolderOpen className="size-3.5" />
              {translate('auto.components.right.sidebar.AiVaultSessionRow.revealLog', 'Reveal Log')}
            </Item>
          ) : null}
          {onOpenCwd ? (
            <Item onSelect={onOpenCwd}>
              <FolderOpen className="size-3.5" />
              {translate(
                'auto.components.right.sidebar.AiVaultSessionRow.openWorkingDirectory',
                'Open Working Directory'
              )}
            </Item>
          ) : null}
        </>
      ) : null}
      <Separator />
      <Item onSelect={onCopyId}>
        {translate(
          'auto.components.right.sidebar.AiVaultSessionRow.copySessionId',
          'Copy Session ID'
        )}
      </Item>
      <Item onSelect={onCopyPath}>
        {translate('auto.components.right.sidebar.AiVaultSessionRow.copyLogPath', 'Copy Log Path')}
      </Item>
      <Separator />
      {deleteBlockedReason ? (
        <Tooltip>
          <TooltipTrigger asChild>
            {/* A disabled item is pointer-events:none, so the trigger needs this
               wrapper to receive hover (as WorktreeContextMenu does). */}
            <div>{deleteItem}</div>
          </TooltipTrigger>
          <TooltipContent
            side={menuKind === 'context' ? 'right' : 'left'}
            sideOffset={8}
            className="max-w-72"
          >
            {deleteBlockedReason}
          </TooltipContent>
        </Tooltip>
      ) : (
        deleteItem
      )}
    </>
  )
}
