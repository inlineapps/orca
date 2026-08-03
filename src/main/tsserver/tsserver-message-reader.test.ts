import { describe, expect, it } from 'vitest'
import { TsserverMessageReader } from './tsserver-message-reader'

function frame(body: unknown): Buffer {
  const json = JSON.stringify(body)
  return Buffer.from(`Content-Length: ${Buffer.byteLength(json)}\r\n\r\n${json}`, 'utf8')
}

describe('TsserverMessageReader', () => {
  it('waits for fragmented headers and multibyte bodies', () => {
    const reader = new TsserverMessageReader()
    const message = frame({ type: 'response', body: '型別 🚀' })

    expect(reader.append(message.subarray(0, 11))).toEqual([])
    expect(reader.append(message.subarray(11, 29))).toEqual([])
    expect(reader.append(message.subarray(29))).toEqual([{ type: 'response', body: '型別 🚀' }])
  })

  it('reads multiple frames while preserving an incomplete tail', () => {
    const reader = new TsserverMessageReader()
    const first = frame({ request_seq: 23, body: ['alpha'] })
    const second = frame({ request_seq: 47, body: ['beta'] })
    const split = second.length - 8

    expect(reader.append(Buffer.concat([first, second.subarray(0, split)]))).toEqual([
      { request_seq: 23, body: ['alpha'] }
    ])
    expect(reader.append(second.subarray(split))).toEqual([{ request_seq: 47, body: ['beta'] }])
  })

  it('drops malformed JSON and continues with the next frame', () => {
    const reader = new TsserverMessageReader()
    const malformed = Buffer.from('Content-Length: 5\r\n\r\n{oops', 'utf8')

    expect(reader.append(Buffer.concat([malformed, frame({ success: true })]))).toEqual([
      { success: true }
    ])
  })
})
