import { expect, test } from './helpers/orca-app'
import {
  configureGoldenStubAgent,
  getGoldenStubAgentLaunchEnv,
  launchGoldenStubAgentFromNewTab
} from './helpers/golden-stub-agent'
import { ensureTerminalVisible, waitForActiveWorktree, waitForSessionReady } from './helpers/store'

test.use({ launchEnv: getGoldenStubAgentLaunchEnv() })

test('model presets stay reachable in the launch menu and workspace composer', async ({
  orcaPage,
  electronApp
}, testInfo) => {
  await waitForSessionReady(orcaPage)
  await waitForActiveWorktree(orcaPage)
  await ensureTerminalVisible(orcaPage)
  await configureGoldenStubAgent(orcaPage, { agent: 'codex' })
  await orcaPage.evaluate(async () => {
    await window.__store!.getState().updateSettings({ experimentalNativeChat: false })
  })
  for (const width of [1280, 820]) {
    await electronApp.evaluate(({ BrowserWindow }, width) => {
      BrowserWindow.getAllWindows()[0].setSize(width, 900)
    }, width)
    for (const scheme of ['dark', 'light']) {
      await orcaPage.emulateMedia({ colorScheme: scheme === 'dark' ? 'dark' : 'light' })
      await orcaPage.evaluate(
        (scheme) => document.documentElement.classList.toggle('dark', scheme === 'dark'),
        scheme
      )
      await orcaPage.getByRole('button', { name: 'New tab', exact: true }).click()
      const submenu = orcaPage.getByRole('menuitem', { name: /Codex.*model and effort/ }).first()
      await expect(submenu).toBeVisible({ timeout: 15_000 })
      await submenu.hover()
      await expect(
        orcaPage.getByRole('menuitem', { name: 'GPT-6.1 Sol · Low', exact: true })
      ).toBeVisible()
      await orcaPage.screenshot({ path: testInfo.outputPath(`menu-${width}-${scheme}.png`) })
      await orcaPage.keyboard.press('Escape')
      await orcaPage.keyboard.press('Escape')
      await orcaPage.evaluate(() => window.__store!.getState().openModal('new-workspace-composer'))
      const picker = orcaPage.getByRole('combobox', { name: 'Model and effort' })
      await expect(picker).toBeVisible()
      await picker.click()
      await orcaPage.getByRole('option', { name: 'GPT-6.1 Sol · Low', exact: true }).click()
      await expect(picker).toContainText('GPT-6.1 Sol · Low')
      await orcaPage.screenshot({ path: testInfo.outputPath(`composer-${width}-${scheme}.png`) })
      await orcaPage.keyboard.press('Escape')
    }
  }
  await launchGoldenStubAgentFromNewTab(orcaPage)
  for (const width of [1280, 820]) {
    await electronApp.evaluate(
      ({ BrowserWindow }, width) => BrowserWindow.getAllWindows()[0].setSize(width, 900),
      width
    )
    await orcaPage
      .getByRole('button', { name: 'Hand Off to Another Agent', exact: true })
      .first()
      .click({ force: true })
    const picker = orcaPage.getByRole('combobox', { name: 'Model and effort' })
    await expect(picker).toBeVisible()
    await picker.click()
    await orcaPage.getByRole('option', { name: 'GPT-6 Astra · High', exact: true }).click()
    await expect(picker).toContainText('GPT-6 Astra · High')
    await orcaPage.screenshot({ path: testInfo.outputPath(`handoff-${width}.png`) })
    await orcaPage.getByRole('button', { name: 'Cancel', exact: true }).click()
  }
  expect(
    await electronApp.evaluate(({ BrowserWindow }) =>
      BrowserWindow.getAllWindows().every((w) => !w.isVisible() && !w.isFocused())
    )
  ).toBe(true)
})
