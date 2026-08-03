#!/usr/bin/env node

import { execFileSync, spawnSync } from 'node:child_process'
import { existsSync, statSync } from 'node:fs'
import { resolve } from 'node:path'

const REPOSITORY = 'inlineapps/orca'
const TAG_PATTERN = /^v(\d+\.\d+\.\d+-inline\.\d+)$/

function fail(message) {
  throw new Error(message)
}

export function parseReleaseArguments(args) {
  if (args.includes('--help')) {
    return { help: true }
  }
  const unknown = args.filter(
    (arg) => arg.startsWith('--') && arg !== '--unsigned' && arg !== '--upload-only'
  )
  if (unknown.length > 0) {
    fail(`Unknown option: ${unknown[0]}`)
  }
  const tags = args.filter((arg) => !arg.startsWith('--'))
  if (tags.length !== 1) {
    fail('Usage: pnpm release:inlineapps:mac vX.Y.Z-inline.N [--unsigned] [--upload-only]')
  }
  const match = TAG_PATTERN.exec(tags[0])
  if (!match) {
    fail('Tag must match vX.Y.Z-inline.N')
  }
  return {
    help: false,
    tag: tags[0],
    version: match[1],
    unsigned: args.includes('--unsigned'),
    uploadOnly: args.includes('--upload-only')
  }
}

export function getReleaseAssetPaths(version) {
  return [
    'dist/orca-macos-x64.dmg',
    'dist/orca-macos-arm64.dmg',
    `dist/Orca-${version}-mac.zip`,
    `dist/Orca-${version}-arm64-mac.zip`
  ]
}

export function createPackagingEnvironment(source, version, unsigned) {
  const env = {
    ...source,
    ORCA_DISABLE_AUTO_UPDATE: '1',
    ORCA_INLINEAPPS_BUILD_VERSION: version
  }
  if (unsigned) {
    delete env.ORCA_MAC_RELEASE
    delete env.ORCA_MAC_HOURLY
    delete env.ORCA_MAC_ADHOC
    delete env.CSC_LINK
    delete env.CSC_KEY_PASSWORD
    delete env.APPLE_ID
    delete env.APPLE_APP_SPECIFIC_PASSWORD
    delete env.APPLE_TEAM_ID
    env.CSC_IDENTITY_AUTO_DISCOVERY = 'false'
  } else {
    env.ORCA_MAC_RELEASE = '1'
  }
  return env
}

function run(command, args, options = {}) {
  execFileSync(command, args, { stdio: 'inherit', ...options })
}

function capture(command, args) {
  return execFileSync(command, args, { encoding: 'utf8' }).trim()
}

function assertReleaseWorkspace() {
  if (process.platform !== 'darwin') {
    fail('Inlineapps macOS releases must run on macOS.')
  }
  if (capture('git', ['branch', '--show-current']) !== 'main') {
    fail('Release from the main branch.')
  }
  if (capture('git', ['status', '--porcelain']) !== '') {
    fail('Commit or stash workspace changes before release.')
  }
  if (!capture('git', ['remote', 'get-url', 'origin']).includes('inlineapps/orca')) {
    fail('origin must target inlineapps/orca.')
  }
}

function buildRelease(version, unsigned) {
  const env = createPackagingEnvironment(process.env, version, unsigned)
  if (!unsigned) {
    run('node', ['config/scripts/verify-macos-release-env.mjs'], { env })
  } else {
    console.warn('Building unsigned artifacts; Gatekeeper and TCC continuity are not guaranteed.')
  }
  run('pnpm', ['verify:macos-entitlements'], { env })
  run('pnpm', ['build:release'], { env })
  run('pnpm', ['build:computer-macos'], { env })
  run('pnpm', ['build:notification-status-macos'], { env })
  run('pnpm', ['ensure:electron-runtime'], { env })
  run(
    'pnpm',
    [
      'exec',
      'electron-builder',
      '--config',
      'config/electron-builder.config.cjs',
      '--mac',
      '--publish',
      'never'
    ],
    { env }
  )
}

function assertAssets(assetPaths) {
  for (const assetPath of assetPaths) {
    if (!existsSync(assetPath) || statSync(assetPath).size === 0) {
      fail(`Missing release asset: ${assetPath}`)
    }
  }
}

function ensureTag(tag) {
  const head = capture('git', ['rev-parse', 'HEAD'])
  const existing = capture('git', ['tag', '--list', tag])
  if (!existing) {
    run('git', ['tag', tag])
    return
  }
  if (capture('git', ['rev-list', '-n', '1', tag]) !== head) {
    fail(`Tag ${tag} does not point to HEAD.`)
  }
}

function pushSource(tag) {
  run('git', ['push', 'origin', 'main'])
  run('git', ['push', 'origin', tag])
}

function releaseExists(tag) {
  return (
    spawnSync('gh', ['release', 'view', tag, '--repo', REPOSITORY], { stdio: 'ignore' }).status ===
    0
  )
}

function publishRelease(tag, version, assetPaths) {
  if (!releaseExists(tag)) {
    run('gh', [
      'release',
      'create',
      tag,
      '--repo',
      REPOSITORY,
      '--verify-tag',
      '--draft',
      '--prerelease',
      '--generate-notes',
      '--title',
      `Orca ${version} (inlineapps)`
    ])
  }
  run('gh', ['release', 'upload', tag, ...assetPaths, '--repo', REPOSITORY, '--clobber'])
  run('gh', ['release', 'edit', tag, '--repo', REPOSITORY, '--draft=false', '--prerelease'])
}

function printHelp() {
  console.log('pnpm release:inlineapps:mac vX.Y.Z-inline.N [--unsigned] [--upload-only]')
}

export function main(args = process.argv.slice(2)) {
  const options = parseReleaseArguments(args)
  if (options.help) {
    printHelp()
    return
  }
  assertReleaseWorkspace()
  const assets = getReleaseAssetPaths(options.version)
  if (!options.uploadOnly) {
    buildRelease(options.version, options.unsigned)
  }
  assertAssets(assets)
  if (capture('git', ['status', '--porcelain']) !== '') {
    fail('Build modified tracked files; review them before release.')
  }
  ensureTag(options.tag)
  pushSource(options.tag)
  publishRelease(options.tag, options.version, assets)
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  try {
    main()
  } catch (error) {
    console.error(error.message)
    process.exit(1)
  }
}
