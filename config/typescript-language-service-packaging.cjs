const { chmodSync, existsSync, readdirSync } = require('node:fs')
const { dirname, join } = require('node:path')

const RESOURCE_NODE_MODULES = 'typescript-language-service/node_modules'

function createTypeScriptLanguageServiceResources() {
  return [
    {
      from: dirname(require.resolve('typescript/package.json')),
      to: `${RESOURCE_NODE_MODULES}/typescript`
    },
    {
      from: dirname(require.resolve('typescript-api/package.json')),
      to: `${RESOURCE_NODE_MODULES}/typescript-api`
    }
  ]
}

function createTypeScriptNativeResource(platform) {
  return {
    from: `node_modules/@typescript/typescript-${platform}-${'${arch}'}`,
    to: `${RESOURCE_NODE_MODULES}/@typescript/typescript-${platform}-${'${arch}'}`
  }
}

function chmodBundledTypeScript(resourcesDir, electronPlatformName) {
  if (electronPlatformName === 'win32') {
    return
  }
  const packageScopeDir = join(resourcesDir, RESOURCE_NODE_MODULES, '@typescript')
  if (!existsSync(packageScopeDir)) {
    return
  }
  for (const packageName of readdirSync(packageScopeDir)) {
    if (!packageName.startsWith(`typescript-${electronPlatformName}-`)) {
      continue
    }
    const executablePath = join(packageScopeDir, packageName, 'lib', 'tsc')
    if (existsSync(executablePath)) {
      chmodSync(executablePath, 0o755)
    }
  }
}

module.exports = {
  chmodBundledTypeScript,
  createTypeScriptLanguageServiceResources,
  createTypeScriptNativeResource
}
