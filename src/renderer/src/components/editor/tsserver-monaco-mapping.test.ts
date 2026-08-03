import { describe, expect, it } from 'vitest'
import type { editor, languages } from 'monaco-editor'
import {
  toMonacoCompletionKind,
  toMonacoRange,
  toTsserverContentEdits,
  toTsserverPosition,
  toTsserverScriptKind
} from './tsserver-monaco-mapping'

describe('tsserver Monaco mapping', () => {
  it('preserves 1-based UTF-16 positions and ranges', () => {
    expect(toTsserverPosition({ lineNumber: 7, column: 19 })).toEqual({ line: 7, offset: 19 })
    expect(toMonacoRange({ start: { line: 5, offset: 13 }, end: { line: 8, offset: 21 } })).toEqual(
      {
        startLineNumber: 5,
        startColumn: 13,
        endLineNumber: 8,
        endColumn: 21
      }
    )
  })

  it('keeps Monaco reverse-ordered edits in protocol order', () => {
    const changes = [
      {
        range: { startLineNumber: 11, startColumn: 7, endLineNumber: 11, endColumn: 12 },
        rangeOffset: 80,
        rangeLength: 5,
        text: 'later'
      },
      {
        range: { startLineNumber: 3, startColumn: 4, endLineNumber: 4, endColumn: 6 },
        rangeOffset: 17,
        rangeLength: 9,
        text: 'earlier'
      }
    ] satisfies editor.IModelContentChange[]

    expect(toTsserverContentEdits(changes)).toEqual([
      {
        start: { line: 11, offset: 7 },
        end: { line: 11, offset: 12 },
        insertString: 'later'
      },
      {
        start: { line: 3, offset: 4 },
        end: { line: 4, offset: 6 },
        insertString: 'earlier'
      }
    ])
  })

  it('maps TS, JS, JSX, and completion kinds', () => {
    const kinds = { Method: 35, Text: 41 } as unknown as typeof languages.CompletionItemKind
    expect(toTsserverScriptKind('/repo/widget.tsx', 'typescript')).toBe('TSX')
    expect(toTsserverScriptKind('C:\\repo\\worker.cts', 'typescript')).toBe('TS')
    expect(toTsserverScriptKind('/repo/view.jsx', 'javascript')).toBe('JSX')
    expect(toTsserverScriptKind('/repo/task.mjs', 'javascript')).toBe('JS')
    expect(toTsserverScriptKind('/repo/data.json', 'json')).toBeNull()
    expect(toMonacoCompletionKind('method', kinds)).toBe(35)
    expect(toMonacoCompletionKind('future-kind', kinds)).toBe(41)
  })
})
