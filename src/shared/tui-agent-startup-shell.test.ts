import { describe, expect, it } from 'vitest'
import {
  buildShellCommandFromArgv,
  quoteStartupArg,
  tokenizeStartupCommand
} from './tui-agent-startup-shell'

function expectSpansCoverTokens(source: string, shell: 'powershell' | 'cmd'): string[] {
  const result = tokenizeStartupCommand(source, shell)
  expect(result.ok).toBe(true)
  if (!result.ok) {
    return []
  }
  expect(result.spans).toHaveLength(result.tokens.length)
  let previousEnd = 0
  for (const [index, { start, end }] of result.spans.entries()) {
    expect(start).toBeGreaterThanOrEqual(previousEnd)
    expect(end).toBeGreaterThan(start)
    // Every raw span must re-tokenize to exactly its own token.
    const slice = tokenizeStartupCommand(source.slice(start, end), shell)
    expect(slice.ok && slice.tokens).toEqual([result.tokens[index]])
    previousEnd = end
  }
  return result.spans.map(({ start, end }) => source.slice(start, end))
}

describe('tokenizeStartupCommand spans (windows shells)', () => {
  it('covers plain and quoted tokens on powershell', () => {
    const source = "claude --msg 'hello world'"
    const result = tokenizeStartupCommand(source, 'powershell')
    expect(result).toEqual({
      ok: true,
      tokens: ['claude', '--msg', 'hello world'],
      spans: [
        { start: 0, end: 6, divergesFromShell: false },
        { start: 7, end: 12, divergesFromShell: false },
        { start: 13, end: 26, divergesFromShell: false }
      ]
    })
  })

  it('starts a span at a token-leading escape character', () => {
    expect(expectSpansCoverTokens('claude ^&literal next', 'cmd')).toEqual([
      'claude',
      '^&literal',
      'next'
    ])
    expect(expectSpansCoverTokens('claude `x tail', 'powershell')).toEqual(['claude', '`x', 'tail'])
  })

  it('spans a powershell doubled-quote token as one raw range', () => {
    expect(expectSpansCoverTokens("claude 'a''b' end", 'powershell')).toEqual([
      'claude',
      "'a''b'",
      'end'
    ])
  })

  it('spans a token opened by a quote at end of input', () => {
    expect(expectSpansCoverTokens('claude ""', 'cmd')).toEqual(['claude', '""'])
  })
})

describe('quoteStartupArg', () => {
  describe('cmd', () => {
    it('passes the neutral metacharacters & | < > ( ) through unmodified inside quotes', () => {
      // Regression: the old quoter caret-escaped inside double quotes, where a
      // caret is literal, so "C:\Foo & Bar" reached the program as C:\Foo ^& Bar.
      expect(quoteStartupArg('C:\\Foo & Bar', 'cmd')).toBe('"C:\\Foo & Bar"')
      expect(quoteStartupArg('a|b<c>d(e)f', 'cmd')).toBe('"a|b<c>d(e)f"')
    })

    it('keeps Windows backslashes literal', () => {
      expect(quoteStartupArg('C:\\Users\\me\\bin\\codex.exe', 'cmd')).toBe(
        '"C:\\Users\\me\\bin\\codex.exe"'
      )
    })
  })

  describe('powershell', () => {
    it('doubles ASCII single quotes', () => {
      expect(quoteStartupArg("it's", 'powershell')).toBe("'it''s'")
    })

    it('doubles the U+2018-U+201B delimiter class PowerShell also treats as quotes', () => {
      expect(quoteStartupArg('a‘b', 'powershell')).toBe("'a‘‘b'")
      expect(quoteStartupArg('a’b', 'powershell')).toBe("'a’’b'")
      expect(quoteStartupArg('a‚b', 'powershell')).toBe("'a‚‚b'")
      expect(quoteStartupArg('a‛b', 'powershell')).toBe("'a‛‛b'")
    })

    it('keeps backslashes and other metacharacters literal', () => {
      expect(quoteStartupArg('C:\\Users\\me', 'powershell')).toBe("'C:\\Users\\me'")
      expect(quoteStartupArg('$env:PATH;&|', 'powershell')).toBe("'$env:PATH;&|'")
    })
  })

  describe('posix', () => {
    it('single-quotes with the standard quote-splice escape', () => {
      expect(quoteStartupArg("it's", 'posix')).toBe(`'it'\\''s'`)
      expect(quoteStartupArg('a $VAR `cmd` "x"', 'posix')).toBe(`'a $VAR \`cmd\` "x"'`)
    })
  })
})

describe('buildShellCommandFromArgv', () => {
  it('quotes each element exactly once per target shell', () => {
    expect(buildShellCommandFromArgv(['/opt/my tools/codex', '--model', 'x y'], 'posix')).toBe(
      `'/opt/my tools/codex' '--model' 'x y'`
    )
    expect(buildShellCommandFromArgv(['codex', '--flag'], 'powershell')).toBe(`& 'codex' '--flag'`)
    expect(buildShellCommandFromArgv(['C:\\a & b\\codex.exe', '--flag'], 'cmd')).toBe(
      '"C:\\a & b\\codex.exe" "--flag"'
    )
  })
})
