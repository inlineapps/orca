# Inlineapps fork maintenance

`inlineapps/orca` intentionally keeps Orca's `productName`, `appId`, executable name, and user-data path. Official and fork builds therefore reuse settings and workspaces. Run only one build at a time; upstream storage migrations can make older builds incompatible.

## Branch model

- `origin/main`: shippable inlineapps fork.
- `upstream/main`: `stablyai/orca` mirror.
- Keep each customization in a small topic commit. Rebase customization commits onto upstream; do not merge upstream into them.

```bash
git fetch upstream
git switch main
git rebase upstream/main
git push --force-with-lease origin main
```

Start only with a clean worktree. Resolve and test each customization before force-pushing.

## macOS release

Release from a clean local `main`. Signing and notarization use local environment variables `CSC_LINK`, `CSC_KEY_PASSWORD`, `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, and `APPLE_TEAM_ID`; GitHub Actions secrets are not used.

```bash
pnpm release:inlineapps:mac v1.4.165-inline.1
```

Without Apple credentials, explicitly build an unsigned release:

```bash
pnpm release:inlineapps:mac v1.4.165-inline.1 --unsigned
```

The command builds x64 and arm64 artifacts, pushes `main` and the tag, then creates the prerelease in `inlineapps/orca`. Use `--upload-only` to reuse existing artifacts after an upload failure.

Fork release builds compile out automatic and manual updater access. Upstream and local development builds keep their existing updater behavior.
