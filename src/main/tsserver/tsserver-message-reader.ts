const HEADER_TERMINATOR = '\r\n\r\n'
const CONTENT_LENGTH_PATTERN = /Content-Length:\s*(\d+)/i

/** Incremental parser for tsserver stdout: `Content-Length: N\r\n\r\n<N bytes of JSON>`. */
export class TsserverMessageReader {
  private buffer: Buffer = Buffer.alloc(0)

  append(chunk: Buffer): unknown[] {
    this.buffer = this.buffer.length === 0 ? chunk : Buffer.concat([this.buffer, chunk])
    const messages: unknown[] = []
    for (;;) {
      const headerEnd = this.buffer.indexOf(HEADER_TERMINATOR)
      if (headerEnd === -1) {
        break
      }
      const header = this.buffer.subarray(0, headerEnd).toString('utf8')
      const lengthMatch = CONTENT_LENGTH_PATTERN.exec(header)
      if (!lengthMatch) {
        this.buffer = this.buffer.subarray(headerEnd + HEADER_TERMINATOR.length)
        continue
      }
      const bodyStart = headerEnd + HEADER_TERMINATOR.length
      const bodyLength = Number(lengthMatch[1])
      if (this.buffer.length < bodyStart + bodyLength) {
        break
      }
      const body = this.buffer.subarray(bodyStart, bodyStart + bodyLength).toString('utf8')
      this.buffer = this.buffer.subarray(bodyStart + bodyLength)
      try {
        messages.push(JSON.parse(body))
      } catch {
        // Malformed frame: drop it and keep the stream alive.
      }
    }
    return messages
  }
}
