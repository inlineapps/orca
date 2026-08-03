import { describe, expect, it } from 'vitest'
import {
  mapCompletionDetailsBody,
  mapCompletionsBody,
  mapDefinitionBody,
  mapQuickInfoBody,
  mapReferencesBody
} from './tsserver-response-mapping'

describe('tsserver response mapping', () => {
  it('maps definitions and reference access metadata', () => {
    const range = { start: { line: 7, offset: 13 }, end: { line: 7, offset: 19 } }

    expect(mapDefinitionBody({ definitions: [{ file: '/repo/src/value.ts', ...range }] })).toEqual([
      { file: '/repo/src/value.ts', ...range }
    ])
    expect(
      mapReferencesBody({
        refs: [
          { file: '/repo/src/value.ts', ...range, isDefinition: true, isWriteAccess: true },
          {
            file: '/repo/src/consumer.ts',
            start: { line: 11, offset: 23 },
            end: { line: 11, offset: 29 },
            isWriteAccess: false
          }
        ]
      })
    ).toEqual([
      { file: '/repo/src/value.ts', ...range, isDefinition: true, isWriteAccess: true },
      {
        file: '/repo/src/consumer.ts',
        start: { line: 11, offset: 23 },
        end: { line: 11, offset: 29 },
        isDefinition: undefined,
        isWriteAccess: false
      }
    ])
    expect(mapDefinitionBody(undefined)).toEqual([])
  })

  it('joins quick-info display parts without losing its range', () => {
    expect(
      mapQuickInfoBody({
        start: { line: 5, offset: 17 },
        end: { line: 5, offset: 26 },
        displayString: 'const capacity: number',
        documentation: [{ text: 'Booking ' }, { text: 'capacity.' }]
      })
    ).toEqual({
      start: { line: 5, offset: 17 },
      end: { line: 5, offset: 26 },
      displayString: 'const capacity: number',
      documentation: 'Booking capacity.'
    })
    expect(mapQuickInfoBody({ documentation: 'missing display' })).toBeNull()
  })

  it('maps completion replacement spans and continuation state', () => {
    expect(
      mapCompletionsBody({
        isMemberCompletion: true,
        isNewIdentifierLocation: false,
        isIncomplete: true,
        optionalReplacementSpan: {
          start: { line: 9, offset: 15 },
          end: { line: 9, offset: 20 }
        },
        entries: [
          {
            name: 'capacity',
            kind: 'property',
            sortText: '23',
            insertText: 'capacity',
            source: './booking-capacity',
            data: { exportName: 'capacity' }
          }
        ]
      })
    ).toEqual({
      isMemberCompletion: true,
      isNewIdentifierLocation: false,
      isIncomplete: true,
      optionalReplacementSpan: {
        start: { line: 9, offset: 15 },
        end: { line: 9, offset: 20 }
      },
      entries: [
        {
          name: 'capacity',
          kind: 'property',
          kindModifiers: undefined,
          sortText: '23',
          insertText: 'capacity',
          filterText: undefined,
          isSnippet: undefined,
          source: './booking-capacity',
          hasAction: undefined,
          data: { exportName: 'capacity' },
          replacementSpan: undefined
        }
      ]
    })
  })

  it('maps completion details and auto-import edits', () => {
    expect(
      mapCompletionDetailsBody([
        {
          displayParts: [{ text: 'const ' }, { text: 'capacity: number' }],
          documentation: [{ text: 'Available seats' }],
          codeActions: [
            {
              description: 'Add import',
              changes: [
                {
                  fileName: '/repo/src/app.ts',
                  textChanges: [
                    {
                      start: { line: 3, offset: 5 },
                      end: { line: 3, offset: 5 },
                      newText: "import { capacity } from './capacity'\n"
                    }
                  ]
                }
              ]
            }
          ]
        }
      ])
    ).toEqual({
      displayString: 'const capacity: number',
      documentation: 'Available seats',
      codeActions: [
        {
          description: 'Add import',
          changes: [
            {
              fileName: '/repo/src/app.ts',
              textChanges: [
                {
                  start: { line: 3, offset: 5 },
                  end: { line: 3, offset: 5 },
                  newText: "import { capacity } from './capacity'\n"
                }
              ]
            }
          ]
        }
      ]
    })
  })
})
