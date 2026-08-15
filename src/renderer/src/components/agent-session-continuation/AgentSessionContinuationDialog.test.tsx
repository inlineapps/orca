// @vitest-environment happy-dom

import React, { type ReactNode, act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AgentSessionContinuationRequest } from '@/lib/agent-session-continuation'

const mocks = vi.hoisted(() => ({
  detectAgents: vi.fn(),
  launchContinuation: vi.fn(),
  writeClipboardText: vi.fn(),
  toastError: vi.fn(),
  settings: { defaultTuiAgent: 'codex', disabledTuiAgents: [] }
}))

vi.mock('sonner', () => ({ toast: { error: mocks.toastError } }))

vi.mock('@/store', () => ({
  useAppStore: (selector: (state: unknown) => unknown) => selector({ settings: mocks.settings })
}))
vi.mock('@/lib/launch-agent-session-continuation', () => ({
  detectAgentSessionContinuationAgents: mocks.detectAgents,
  launchAgentSessionContinuation: mocks.launchContinuation
}))
vi.mock('@/lib/agent-catalog', () => ({
  getAgentCatalog: () => [{ id: 'codex', label: 'Codex' }],
  getAgentLabel: () => 'Codex'
}))
vi.mock('@/components/agent/AgentCombobox', () => ({
  default: ({ value }: { value: string | null }) =>
    React.createElement('div', { 'data-agent': value ?? '' })
}))
vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ open, children }: { open: boolean; children?: ReactNode }) =>
    open ? React.createElement('div', null, children) : null,
  DialogContent: ({ children }: { children?: ReactNode }) =>
    React.createElement('div', null, children),
  DialogDescription: ({ children }: { children?: ReactNode }) =>
    React.createElement('p', null, children),
  DialogFooter: ({ children }: { children?: ReactNode }) =>
    React.createElement('footer', null, children),
  DialogHeader: ({ children }: { children?: ReactNode }) =>
    React.createElement('header', null, children),
  DialogTitle: ({ children }: { children?: ReactNode }) => React.createElement('h2', null, children)
}))
// Why: a native select keeps the mock driveable — tests can pick an option and
// see the value reach onValueChange, which a div stack cannot express.
vi.mock('@/components/ui/select', () => ({
  Select: ({
    value,
    onValueChange,
    children
  }: {
    value?: string
    onValueChange?: (value: string) => void
    children?: ReactNode
  }) =>
    React.createElement(
      'select',
      {
        value: value ?? '',
        onChange: (event: React.ChangeEvent<HTMLSelectElement>) =>
          onValueChange?.(event.target.value)
      },
      children
    ),
  SelectContent: ({ children }: { children?: ReactNode }) =>
    React.createElement(React.Fragment, null, children),
  SelectItem: ({ value, children }: { value: string; children?: ReactNode }) =>
    React.createElement('option', { value }, children),
  SelectTrigger: () => null,
  SelectValue: () => null
}))

import { AgentSessionContinuationDialog } from './AgentSessionContinuationDialog'

function request(
  worktreeId: string,
  source?: Partial<AgentSessionContinuationRequest['source']>
): AgentSessionContinuationRequest {
  return {
    source: { capturedText: 'previous session', sourceAgent: 'codex', ...source },
    worktreeId,
    workspacePath: '/repo',
    launchSource: 'sidebar'
  }
}

// Why: React tracks a controlled select's value, so a plain assignment before
// dispatch is swallowed; go through the prototype setter it does not shadow.
function selectOption(select: HTMLSelectElement, value: string): void {
  Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')?.set?.call(select, value)
  select.dispatchEvent(new Event('change', { bubbles: true }))
}

function findButton(container: HTMLElement, label: string): HTMLButtonElement | null {
  return (
    Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes(label)
    ) ?? null
  )
}

describe('AgentSessionContinuationDialog', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    ;(
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true
    vi.clearAllMocks()
    mocks.writeClipboardText.mockResolvedValue(undefined)
    ;(window as unknown as { api: { ui: { writeClipboardText: unknown } } }).api = {
      ui: { writeClipboardText: mocks.writeClipboardText }
    }
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
  })

  it('clears a prior detection failure while detecting a new request', async () => {
    let resolveSecond: (agents: ['codex']) => void = () => {}
    mocks.detectAgents.mockRejectedValueOnce(new Error('offline')).mockReturnValueOnce(
      new Promise<['codex']>((resolve) => {
        resolveSecond = resolve
      })
    )

    await act(async () => {
      root.render(
        <AgentSessionContinuationDialog open request={request('wt-1')} onOpenChange={vi.fn()} />
      )
    })
    await vi.waitFor(() => expect(container.textContent).toContain('Could not detect Agents'))

    act(() => {
      root.render(
        <AgentSessionContinuationDialog open request={request('wt-2')} onOpenChange={vi.fn()} />
      )
    })
    expect(container.textContent).toContain('Detecting Agents')
    expect(container.textContent).not.toContain('Could not detect Agents')

    await act(async () => resolveSecond(['codex']))
    await vi.waitFor(() => expect(container.querySelector('[data-agent="codex"]')).not.toBeNull())
  })

  it('copies the same handoff prompt the launch would deliver', async () => {
    mocks.detectAgents.mockResolvedValue(['codex'])

    await act(async () => {
      root.render(
        <AgentSessionContinuationDialog
          open
          request={request('wt-7', { capturedText: 'user: rerun the seeding script' })}
          onOpenChange={vi.fn()}
        />
      )
    })

    await act(async () => {
      findButton(container, 'Copy prompt')?.click()
    })

    expect(mocks.writeClipboardText).toHaveBeenCalledTimes(1)
    const copied = mocks.writeClipboardText.mock.calls[0][0] as string
    expect(copied).toContain('Continue work from the prior Orca session')
    expect(copied).toContain('user: rerun the seeding script')
    await vi.waitFor(() => expect(container.textContent).toContain('Prompt copied'))
  })

  it('disables copying when the session carries no transcript or capture', async () => {
    mocks.detectAgents.mockResolvedValue(['codex'])

    await act(async () => {
      root.render(
        <AgentSessionContinuationDialog
          open
          request={request('wt-8', { capturedText: '   ' })}
          onOpenChange={vi.fn()}
        />
      )
    })

    expect(findButton(container, 'Copy prompt')?.disabled).toBe(true)
  })

  it('surfaces a clipboard failure instead of claiming the prompt was copied', async () => {
    mocks.detectAgents.mockResolvedValue(['codex'])
    mocks.writeClipboardText.mockRejectedValue(new Error('clipboard unavailable'))
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    await act(async () => {
      root.render(
        <AgentSessionContinuationDialog open request={request('wt-9')} onOpenChange={vi.fn()} />
      )
    })

    await act(async () => {
      findButton(container, 'Copy prompt')?.click()
    })

    expect(mocks.toastError).toHaveBeenCalledTimes(1)
    expect(container.textContent).not.toContain('Prompt copied')
    consoleError.mockRestore()
  })

  it('starts the new session on the picked model', async () => {
    mocks.detectAgents.mockResolvedValue(['codex'])
    mocks.launchContinuation.mockResolvedValue(true)

    await act(async () => {
      root.render(
        <AgentSessionContinuationDialog open request={request('wt-11')} onOpenChange={vi.fn()} />
      )
    })

    const modelSelect = Array.from(container.querySelectorAll('select')).find((select) =>
      select.querySelector('option[value="gpt-5.5"]')
    )
    expect(modelSelect).toBeDefined()

    await act(async () => {
      selectOption(modelSelect!, 'gpt-5.5')
    })
    await act(async () => {
      findButton(container, 'Start New Session')?.click()
    })

    expect(mocks.launchContinuation).toHaveBeenCalledWith(
      expect.objectContaining({ agent: 'codex', modelId: 'gpt-5.5' })
    )
  })

  it('leaves the model out of the launch when none is picked', async () => {
    mocks.detectAgents.mockResolvedValue(['codex'])
    mocks.launchContinuation.mockResolvedValue(true)

    await act(async () => {
      root.render(
        <AgentSessionContinuationDialog open request={request('wt-12')} onOpenChange={vi.fn()} />
      )
    })
    await act(async () => {
      findButton(container, 'Start New Session')?.click()
    })

    expect(mocks.launchContinuation).toHaveBeenCalledTimes(1)
    expect(mocks.launchContinuation.mock.calls[0][0]).not.toHaveProperty('modelId')
  })
})
