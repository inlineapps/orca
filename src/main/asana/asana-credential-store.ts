import { safeStorage } from 'electron'
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import {
  CredentialDecryptionError,
  credentialFileHasContent,
  readStoredCredentialToken
} from '../integration-credential-file'

const TOKEN_FILE = 'asana-token.enc'

let cachedToken: string | null = null
let tokenLoaded = false
let credentialError: string | undefined

function getTokenPath(): string {
  return join(homedir(), '.orca', TOKEN_FILE)
}

function ensureOrcaDir(): void {
  const dir = join(homedir(), '.orca')
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
}

export function loadAsanaToken(options: { force?: boolean } = {}): string | null {
  if (tokenLoaded && cachedToken) {
    return cachedToken
  }
  if (!options.force || !credentialFileHasContent(getTokenPath())) {
    return cachedToken
  }
  try {
    const token = readStoredCredentialToken('Asana', readFileSync(getTokenPath()))
    cachedToken = token
    tokenLoaded = true
    credentialError = undefined
    return token
  } catch (error) {
    if (error instanceof CredentialDecryptionError) {
      credentialError = error.message
      tokenLoaded = true
      throw error
    }
    return null
  }
}

export function hasStoredAsanaToken(): boolean {
  return Boolean(cachedToken) || credentialFileHasContent(getTokenPath())
}

export function getAsanaCredentialError(): string | undefined {
  return credentialError
}

export function saveAsanaToken(token: string): void {
  ensureOrcaDir()
  if (safeStorage.isEncryptionAvailable()) {
    writeFileSync(getTokenPath(), safeStorage.encryptString(token), { mode: 0o600 })
  } else {
    console.warn('[asana] safeStorage encryption unavailable — storing token in plaintext')
    writeFileSync(getTokenPath(), token, { encoding: 'utf8', mode: 0o600 })
  }
  cachedToken = token
  tokenLoaded = true
  credentialError = undefined
}

export function clearAsanaToken(): void {
  cachedToken = null
  tokenLoaded = true
  credentialError = undefined
  try {
    unlinkSync(getTokenPath())
  } catch {
    // Missing token is already disconnected.
  }
}
