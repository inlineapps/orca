import { useEffect } from 'react'
import type { Dispatch, RefObject, SetStateAction } from 'react'
import type { editor } from 'monaco-editor'
import { monaco } from '@/lib/monaco-setup'
import {
  getDiffCommentPopoverLeft,
  getDiffCommentPopoverTop
} from '../diff-comments/diff-comment-popover-position'

export type DiffCommentPopoverState = {
  lineNumber: number
  startLine?: number
  top: number
  left?: number
  lineHeight: number
}

/** Keeps an open popover pinned to its line while the modified pane scrolls, resizes, or reflows. */
export function useDiffCommentPopoverPosition({
  modifiedEditor,
  popoverLineNumber,
  diffBodyRef,
  setPopover
}: {
  modifiedEditor: editor.ICodeEditor | null
  // Why: take the line number, not the popover object, so the effect doesn't re-subscribe on every top update.
  popoverLineNumber: number | null
  diffBodyRef: RefObject<HTMLDivElement | null>
  setPopover: Dispatch<SetStateAction<DiffCommentPopoverState | null>>
}): void {
  useEffect(() => {
    if (!modifiedEditor || popoverLineNumber === null) {
      return
    }
    const update = (): void => {
      const lineHeight = modifiedEditor.getOption(monaco.editor.EditorOption.lineHeight)
      const top = getDiffCommentPopoverTop(modifiedEditor, popoverLineNumber, lineHeight)
      if (top == null) {
        setPopover(null)
        return
      }
      const left = getDiffCommentPopoverLeft(modifiedEditor, diffBodyRef.current)
      setPopover((prev) =>
        prev ? { ...prev, top, left: left == null ? prev.left : left, lineHeight } : prev
      )
    }
    const scrollSub = modifiedEditor.onDidScrollChange(update)
    const contentSub = modifiedEditor.onDidContentSizeChange(update)
    const layoutSub = modifiedEditor.onDidLayoutChange(update)
    return () => {
      scrollSub.dispose()
      contentSub.dispose()
      layoutSub.dispose()
    }
  }, [modifiedEditor, popoverLineNumber, diffBodyRef, setPopover])
}
