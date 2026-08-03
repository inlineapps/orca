<<<<<<< HEAD
=======
/* eslint-disable max-lines -- Why: the preload contract is intentionally centralized in one declaration file so renderer and preload stay in lockstep when IPC surfaces change. */
import type {
  CreateHostedReviewArgs,
  CreateHostedReviewResult,
  CreateStackedHostedReviewArgs,
  CreateStackedHostedReviewResult,
  HostedReviewCreationEligibility,
  HostedReviewCreationEligibilityArgs,
  HostedReviewForBranchArgs,
  HostedReviewInfo,
  HostedReviewProvider
} from '../shared/hosted-review'
import type {
  BitbucketConnectArgs,
  BitbucketConnectionStatus
} from '../shared/bitbucket-credentials'
import type { NativeFileDropPayload } from '../shared/native-file-drop'
import type { ComputerAwakeStatus } from '../shared/computer-awake-mode'
import type {
  TsserverCompletionDetails,
  TsserverCompletionRequestArgs,
  TsserverCompletions,
  TsserverContentEdit,
  TsserverFileLocationArgs,
  TsserverFileSpan,
  TsserverIpcResult,
  TsserverQuickInfo,
  TsserverReferenceSpan,
  TsserverRootAvailability,
  TsserverScriptKindName
} from '../shared/tsserver-language-service'
import type { BrowserFindSource } from '../shared/browser-find-source'
import type {
  DashboardRevealAgentArgs,
  DashboardSleepWorkspaceArgs,
  DashboardSnapshot,
  DashboardSpawnAgentArgs
} from '../shared/dashboard-snapshot'
import type {
  TerminalPreviewConnectResult,
  TerminalPreviewDataPayload
} from '../shared/terminal-preview'
import type {
  TerminalTabCloseRequest,
  TerminalTabCloseResponse
} from '../shared/terminal-tab-close'
import type { TerminalTabCreateReply } from '../shared/terminal-reveal-identity'
import type {
  LocalLogTailChangedPayload,
  LocalLogTailReadArgs,
  LocalLogTailReadResult,
  LocalLogTailWatchArgs
} from '../shared/local-log-tail-types'
import type { ReadClipboardTextOptions } from '../shared/clipboard-text'
import type { AppIdentity } from '../shared/app-identity'
import type { ReleaseChannel } from '../shared/release-channel'
import type {
  ForgetRemovedWorktreesForExecutionHostArgs,
  ForgetRemovedWorktreesForExecutionHostResult,
  HostQualifiedKnownWorktreeResult,
  HostQualifiedDetectedWorktreeResult,
  LegacyDetectedWorktreeRequest,
  ListKnownWorktreesForExecutionHostArgs,
  ListDetectedWorktreesArgs,
  ProviderRequestId
} from '../shared/detected-worktree-provider-contract'
import type {
  HostRepoCatalogSnapshot,
  ListReposForExecutionHostArgs
} from '../shared/host-repo-catalog-contract'
import type {
  HostLineageSnapshot,
  ListDesktopLineageForHostArgs
} from '../shared/host-lineage-contract'
import type {
  WriteTerminalRenderDesyncEvidenceArgs,
  WriteTerminalRenderDesyncEvidenceResult
} from '../shared/terminal-render-desync-evidence'
import type { MobileRelayStatus } from '../shared/mobile-relay-status'
import type { MobilePairingConnectionMode } from '../shared/mobile-pairing-connection-mode'
import type { RuntimePairingReach } from '../shared/runtime-pairing-reach'
import type { MobileRelayMintFailure } from '../shared/mobile-relay-mint-failure'
import type { VerifyAndAddRuntimeEnvironmentResult } from '../shared/remote-pairing-verification'
import type {
  SshMutationExpectation,
  SshConnectionState,
  SshConfigHostListArgs,
  SshConfigHostListResult,
  SshConfigHostResolution,
  SshConfigImportResult,
  SshTargetAddResult,
  SshTarget,
  PortForwardEntry,
  EnrichedDetectedPort
} from '../shared/ssh-types'
import type {
  CreateLocalOrcaProfileArgs,
  CreateLocalOrcaProfileResult,
  CreateCloudLinkedOrcaProfileArgs,
  CreateCloudLinkedOrcaProfileResult,
  ConnectCurrentOrcaProfileResult,
  FindOrcaProfileProjectsByPathArgs,
  FindOrcaProfileProjectsByPathResult,
  OrcaProfileListResult,
  OrcaProfileAuthStatus,
  RefreshCurrentOrcaProfileAuthResult,
  SelectOrcaProfileOrgArgs,
  SelectOrcaProfileOrgResult,
  SignOutCurrentOrcaProfileResult,
  SwitchOrcaProfileArgs,
  SwitchOrcaProfileResult,
  TransferOrcaProfileProjectArgs,
  TransferOrcaProfileProjectResult,
  OrcaProfileOrgInviteRevokeArgs,
  OrcaProfileOrgMemberChangeRoleArgs,
  OrcaProfileOrgMemberInviteArgs,
  OrcaProfileOrgMemberMutationResult,
  OrcaProfileOrgMemberRemoveArgs,
  OrcaProfileOrgMembersListArgs,
  OrcaProfileOrgMembersListResult
} from '../shared/orca-profiles'
import type { TerminalPaneSplitSource } from '../shared/feature-education-telemetry'
import type { TaskSourceContext } from '../shared/task-source-context'
import type { LinearIssueAttributeFilter } from '../shared/linear-issue-attribute-filter'
import type { ProjectExecutionRuntimeResolution } from '../shared/project-execution-runtime'
import type { StartupCommandDelivery } from '../shared/codex-startup-delivery'
import type {
  AgentProviderSessionMetadata,
  SleepingAgentLaunchConfig
} from '../shared/agent-session-resume'
import type {
  PluginPanelActionOutcome,
  PluginPanelEntry
} from '../shared/plugins/plugin-panel-bridge'
import type { PluginConsentRequest } from '../shared/plugins/plugin-consent-request'
import type { PluginLanguagePackRegistration } from '../shared/plugins/plugin-language-pack-artifact'
import type { PluginChangeEvent } from '../shared/plugins/plugin-change-event'
import type { PluginManifest } from '../shared/plugins/plugin-manifest'
import type { PluginMarketplaceGitSource } from '../shared/plugins/plugin-marketplace'
import type {
  LocalhostWorktreeLabelResult,
  LocalhostWorktreeLabelRoute
} from '../shared/localhost-worktree-labels'
import type {
  FolderWorkspacePathStatus,
  FolderWorkspacePathStatusRequest
} from '../shared/folder-workspace-path-status'
import type {
  BaseRefDefaultResult,
  BaseRefSearchResult,
  BrowserCookieImportResult,
  BrowserCertificateFailure,
  BrowserCertificateProceedResult,
  BrowserLoadError,
  BrowserSessionProfile,
  BrowserSessionProfileCreateOptions,
  BrowserSessionProfileScope,
  BrowserSessionProfileSource,
  BrowserViewportOverride,
  ClaudeRateLimitAccountsState,
  ClassifiedError,
  CodexRateLimitAccountsState,
  CreateWorktreeArgs,
  CreateWorktreeResult,
  CustomPet,
  DetectedWorktreeListResult,
  DirEntry,
  FilesystemPathFlavor,
  ForceDeleteWorktreeBranchResult,
  FsChangedPayload,
  GhosttyImportPreview,
  GlobalSettings,
  GitBranchCompareResult,
  GitCommitCompareResult,
  GitConflictOperation,
  GitDiffResult,
  GitForkSyncExpectedUpstream,
  GitForkSyncResult,
  GitPushTarget,
  GitStagingArea,
  GitStatusResult,
  GitUpstreamStatus,
  GitHubAssignableUser,
  GitHubCreateIssueResult,
  GitHubPRFile,
  GitHubPRFileContents,
  GitHubPrStartPoint,
  GitHubPRReviewCommentInput,
  GitHubCommentResult,
  GitHubOwnerRepo,
  GitHubWorkItem,
  GitHubWorkItemDetails,
  GitHubViewer,
  GitLabAssignableUser,
  GitLabAuthDiagnostic,
  GitLabCommentResult,
  GitLabDiscussionResolveResult,
  GitLabIssueInfo,
  GitLabIssueUpdate,
  GitLabJobTraceResult,
  GitLabMRInlineCommentInput,
  GitLabMRReviewersUpdateResult,
  GitLabMRUpdate,
  GitLabProjectRef,
  GitLabRetryJobResult,
  GitLabTodo,
  GitLabViewer,
  GitLabWorkItem,
  GitLabWorkItemDetails,
  GetGitLabRateLimitResult,
  ListMergeRequestsResult,
  MRInfo,
  MRListState,
  ListWorkItemsResult,
  IssueInfo,
  JiraComment,
  JiraConnectionStatus,
  JiraCreateField,
  JiraCreateIssueArgs,
  JiraIssue,
  JiraIssueFilter,
  JiraIssueType,
  JiraProjectStatusOrder,
  JiraIssueUpdate,
  JiraPriority,
  JiraProject,
  JiraSiteSelection,
  JiraTransition,
  JiraUser,
  JiraViewer,
  LinearViewer,
  LinearCollectionResult,
  LinearConnectionStatus,
  LinearCustomViewModel,
  LinearCustomViewSummary,
  LinearWorkspaceSelection,
  LinearIssue,
  LinearIssueUpdate,
  LinearComment,
  LinearWorkflowState,
  LinearLabel,
  LinearMember,
  LinearProjectDetail,
  LinearProjectSummary,
  LinearTeam,
  MarkdownDocument,
  FloatingTerminalCwdRequest,
  GitHubIssueUpdate,
  GitHubReactionContent,
  GitHubPRRefreshCandidate,
  GitHubPRRefreshEnqueueResult,
  GitHubPRRefreshEvent,
  GitHubPRRefreshReason,
  GetRateLimitResult,
  NotificationDispatchRequest,
  NotificationDispatchResult,
  NotificationDeliveryProbeResult,
  NotificationDismissResult,
  NotificationPermissionStatusResult,
  NotificationSoundResult,
  OnboardingState,
  OrcaHooks,
  PathSource,
  PersistedUIState,
  PRCheckDetail,
  PRCheckRunDetails,
  PRComment,
  PRInfo,
  PRRefreshOutcome,
  Project,
  ProjectUpdateArgs,
  Repo,
  ProjectGroup,
  ProjectHostSetup,
  ProjectHostSetupCreateArgs,
  ProjectHostSetupCreateResult,
  ProjectHostSetupDeleteArgs,
  ProjectHostSetupDeleteResult,
  ProjectHostSetupExistingFolderArgs,
  ProjectHostSetupResult,
  ProjectHostSetupUpdateArgs,
  ProjectHostSetupUpdateResult,
  FolderWorkspace,
  ProjectGroupImportResult,
  ProjectGroupImportMode,
  ShellHydrationFailureReason,
  SparsePreset,
  SearchOptions,
  NestedRepoScanResult,
  SearchResult,
  StatsSummary,
  MemorySnapshot,
  TuiAgent,
  ReleaseBuildListResult,
  UpdateCheckOptions,
  UpdateStatus,
  Worktree,
  WorktreeBaseStatusEvent,
  WorktreeHeadIdentity,
  WorktreeLineage,
  WorkspaceLineage,
  WorktreeMeta,
  WorktreeRemoteBranchConflictEvent,
  RemoveWorktreeResult,
  WorktreeDefaultTabsLaunch,
  WorktreeSetupLaunch,
  WorktreeStartupLaunch,
  WorkspaceSessionPatch,
  WorkspaceSessionState,
  LinuxPackageInstallInstructions
} from '../shared/types'
import type { PtyModelRestoreNeededEvent } from '../shared/pty-model-restore-marker'
import type { PtyListedSession } from '../shared/pty-listed-session'
import type {
  PtyRendererDeliveryHealthReply,
  PtyRendererDeliveryStateReport
} from '../shared/pty-renderer-delivery-health'
import type { TerminalViewAttributes } from '../shared/terminal-view-attributes'
import type { PtyMainDeliveryDiagnostics } from '../shared/pty-delivery-diagnostics'
import type {
  WarpThemeImportPreview,
  WarpThemeImportSource
} from '../shared/terminal-custom-themes'

import type { SetupScriptImportCandidate } from '../shared/setup-script-imports'
import type { GitHistoryOptions, GitHistoryResult } from '../shared/git-history'
import type { PublicKnownRuntimeEnvironment } from '../shared/runtime-environments'
import type { EphemeralVmRecipeDoctorResult } from '../shared/ephemeral-vm-recipes'
import type { EphemeralVmRecipeResultWarning } from '../shared/ephemeral-vm-recipe-diagnostics'
import type { EphemeralVmRuntimeRecord } from '../shared/ephemeral-vm-runtimes'
import type { RuntimeAccessGrant } from '../shared/runtime-access-grants'
import type { RuntimeRpcResponse } from '../shared/runtime-rpc-envelope'
import type { ExecutionHostId } from '../shared/execution-host'
import type { FeatureInteractionId } from '../shared/feature-interactions'
import type {
  AddIssueCommentBySlugArgs,
  ClearProjectItemFieldArgs,
  DeleteIssueCommentBySlugArgs,
  GetProjectViewTableArgs,
  GetProjectViewTableResult,
  GitHubProjectCommentMutationResult,
  GitHubProjectMutationResult,
  ListAccessibleProjectsArgs,
  ListAccessibleProjectsResult,
  ListAssignableUsersBySlugArgs,
  ListAssignableUsersBySlugResult,
  ListIssueTypesBySlugArgs,
  ListIssueTypesBySlugResult,
  ListLabelsBySlugArgs,
  ListLabelsBySlugResult,
  ListProjectViewsArgs,
  ListProjectViewsResult,
  ProjectWorkItemDetailsBySlugArgs,
  ProjectWorkItemDetailsBySlugResult,
  ResolveProjectRefArgs,
  ResolveProjectRefResult,
  UpdateIssueBySlugArgs,
  UpdateIssueCommentBySlugArgs,
  UpdateIssueTypeBySlugArgs,
  UpdatePullRequestBySlugArgs,
  UpdateProjectItemFieldArgs
} from '../shared/github-project-types'
import type {
  RichMarkdownContextMenuCommandPayload,
  RichMarkdownContextMenuTableTarget
} from '../shared/rich-markdown-context-menu'
import type {
  BrowserSetGrabModeArgs,
  BrowserSetGrabModeResult,
  BrowserAwaitGrabSelectionArgs,
  BrowserGrabResult,
  BrowserCancelGrabArgs,
  BrowserCaptureSelectionScreenshotArgs,
  BrowserCaptureSelectionScreenshotResult,
  BrowserExtractHoverArgs,
  BrowserExtractHoverResult
} from '../shared/browser-grab-types'
import type {
  BrowserContextMenuDismissedEvent,
  BrowserContextMenuRequestedEvent,
  BrowserDownloadFinishedEvent,
  BrowserDownloadProgressEvent,
  BrowserDownloadRequestedEvent,
  BrowserPermissionDeniedEvent,
  BrowserPopupEvent
} from '../shared/browser-guest-events'
>>>>>>> a115a8fb8b (feat(editor): add TypeScript language service)
import type { ElectronAPI } from '@electron-toolkit/preload'
import type {
  ClaudeAccountsApi,
  CodexAccountsApi,
  CodexConfigSyncApi,
  GrokAccountsApi,
  MinimaxCredentialsApi
} from './api/agent-account-api'
import type { AgentHooksApi, HooksApi } from './api/agent-hook-api'
import type { SkillsApi } from './api/agent-skill-api'
import type { AgentAwakeApi, AgentStatusApi, AgentTrustApi } from './api/agent-status-api'
import type {
  ClaudeUsageApi,
  CodexUsageApi,
  OpenCodeUsageApi,
  RateLimitsApi
} from './api/agent-usage-api'
import type { AiVaultApi } from './api/ai-vault-api'
import type { AppApi, E2EApi, PlatformApi } from './api/app-api'
import type { AutomationsApi } from './api/automation-api'
import type { BrowserApi } from './api/browser-api'
import type { CliApi } from './api/cli-install-api'
import type { CrashReportsApi, FeedbackApi } from './api/crash-report-api'
import type { DashboardApi, TerminalPreviewApi } from './api/dashboard-api'
import type { EmulatorApi } from './api/emulator-api'
import type { EphemeralVmApi } from './api/ephemeral-vm-api'
import type { ExportApi, FilesystemApi } from './api/filesystem-api'
import type { GitInspectionApi } from './api/git-inspection-api'
import type { GitOperationApi } from './api/git-operation-api'
import type { GithubPullRequestApi } from './api/github-pull-request-api'
import type { GithubWorkItemApi } from './api/github-work-item-api'
import type { GitLabApi } from './api/gitlab-api'
import type { BitbucketApi, HostedReviewApi } from './api/hosted-review-api'
import type { JiraApi } from './api/jira-api'
import type { LinearApi } from './api/linear-api'
import type { MobileApi } from './api/mobile-api'
import type { NativeChatApi } from './api/native-chat-api'
import type { OnboardingApi, StarNagApi } from './api/onboarding-api'
import type { OrcaProfileApi } from './api/orca-profile-api'
import type {
  ComputerUsePermissionsApi,
  DeveloperPermissionsApi,
  MacosTccPromptsApi,
  NotificationsApi
} from './api/os-permission-api'
import type { PetApi } from './api/pet-api'
import type { PluginsApi } from './api/plugin-host-api'
import type { PreflightApi } from './api/preflight-api'
import type { PtyApi } from './api/pty-api'
import type { ProjectGroupsApi, ProjectsApi, RepositoryApi } from './api/repository-api'
import type { RuntimeApi } from './api/runtime-api'
import type { KeybindingsApi, SettingsApi } from './api/settings-api'
import type { ShellApi } from './api/shell-api'
import type { SpeechApi } from './api/speech-api'
import type { SshApi } from './api/ssh-api'
import type { DiagnosticsApi, MemoryApi, StatsApi, TelemetryApi } from './api/telemetry-api'
import type { UiCommandEventApi } from './api/ui-command-event-api'
import type { UiWindowApi } from './api/ui-window-api'
import type { UpdaterApi } from './api/updater-api'
import type { WorkspaceCleanupApi, WorkspaceSpaceApi } from './api/workspace-cleanup-api'
import type { LocalhostWorktreeLabelsApi, WorkspacePortsApi } from './api/workspace-port-api'
import type { WorkspaceSessionApi } from './api/workspace-session-api'
import type { FolderWorkspacesApi, SparsePresetsApi, WorktreeApi } from './api/worktree-api'

// Flattens contracts that share one PreloadApi key: an intersection is not type-identical to the flat shape.
type Merged<T> = { [K in keyof T]: T[K] }

export type TsserverApi = {
  probeRoot: (args: { rootPath: string }) => Promise<TsserverRootAvailability>
  openFile: (args: {
    rootPath: string
    worktreeId: string
    file: string
    fileContent: string
    scriptKindName: TsserverScriptKindName
  }) => Promise<boolean>
  updateFile: (args: {
    rootPath: string
    file: string
    edits: TsserverContentEdit[]
  }) => Promise<boolean>
  closeFile: (args: { rootPath: string; file: string }) => Promise<void>
  definition: (args: TsserverFileLocationArgs) => Promise<TsserverIpcResult<TsserverFileSpan[]>>
  references: (
    args: TsserverFileLocationArgs
  ) => Promise<TsserverIpcResult<TsserverReferenceSpan[]>>
  quickinfo: (
    args: TsserverFileLocationArgs
  ) => Promise<TsserverIpcResult<TsserverQuickInfo | null>>
  completions: (
    args: TsserverCompletionRequestArgs
  ) => Promise<TsserverIpcResult<TsserverCompletions | null>>
  completionDetails: (
    args: TsserverFileLocationArgs & { entryName: string; source?: string; data?: unknown }
  ) => Promise<TsserverIpcResult<TsserverCompletionDetails | null>>
}

export type PreloadApi = {
  app: AppApi
  orcaProfiles: OrcaProfileApi
  platform: PlatformApi
  e2e: E2EApi
  repos: RepositoryApi
  projects: ProjectsApi
  projectGroups: ProjectGroupsApi
  folderWorkspaces: FolderWorkspacesApi
  sparsePresets: SparsePresetsApi
  worktrees: WorktreeApi
  workspaceCleanup: WorkspaceCleanupApi
  workspaceSpace: WorkspaceSpaceApi
  workspacePorts: WorkspacePortsApi
  pty: PtyApi
  feedback: FeedbackApi
  crashReports: CrashReportsApi
  export: ExportApi
  gh: Merged<GithubPullRequestApi & GithubWorkItemApi>
  hostedReview: HostedReviewApi
  gl: GitLabApi
  bitbucket: BitbucketApi
  linear: LinearApi
  jira: JiraApi
  starNag: StarNagApi
  telemetryTrack: TelemetryApi['telemetryTrack']
  telemetrySetOptIn: TelemetryApi['telemetrySetOptIn']
  diagnostics: DiagnosticsApi
  telemetryGetConsentState: TelemetryApi['telemetryGetConsentState']
  telemetryAcknowledgeBanner: TelemetryApi['telemetryAcknowledgeBanner']
  settings: SettingsApi
  agentAwake: AgentAwakeApi
  localhostWorktreeLabels: LocalhostWorktreeLabelsApi
  keybindings: KeybindingsApi
  codexAccounts: CodexAccountsApi
  claudeAccounts: ClaudeAccountsApi
  cli: CliApi
  codexConfigSync: CodexConfigSyncApi
  agentHooks: AgentHooksApi
  agentTrust: AgentTrustApi
  preflight: PreflightApi
<<<<<<< HEAD
  notifications: NotificationsApi
  onboarding: OnboardingApi
  dashboard: DashboardApi
  terminalPreview: TerminalPreviewApi
  macosTccPrompts: MacosTccPromptsApi
  developerPermissions: DeveloperPermissionsApi
  computerUsePermissions: ComputerUsePermissionsApi
  shell: ShellApi
  skills: SkillsApi
  pet: PetApi
=======
  notifications: {
    dispatch: (args: NotificationDispatchRequest) => Promise<NotificationDispatchResult>
    dismiss: (ids: string[]) => Promise<NotificationDismissResult>
    openSystemSettings: () => Promise<void>
    getPermissionStatus: () => Promise<NotificationPermissionStatusResult>
    probeDelivery: (args?: { force?: boolean }) => Promise<NotificationDeliveryProbeResult>
    playSound: (options?: { force?: boolean; volume?: number }) => Promise<NotificationSoundResult>
  }
  onboarding: {
    get: () => Promise<OnboardingState>
    // Why: main merges the checklist field-by-field, so a partial checklist is fine.
    update: (
      updates: Partial<Omit<OnboardingState, 'checklist'>> & {
        checklist?: Partial<OnboardingState['checklist']>
      }
    ) => Promise<OnboardingState>
  }
  dashboard: {
    openPopout: (view?: 'board' | 'map') => Promise<void>
    publishSnapshot: (snapshot: DashboardSnapshot) => Promise<void>
    getPopoutOpen: () => Promise<boolean>
    onPopoutOpenChanged: (callback: (open: boolean) => void) => () => void
    onSnapshotRequested: (callback: () => void) => () => void
    onRevealAgent: (callback: (args: DashboardRevealAgentArgs) => void) => () => void
    onAckAgent: (callback: (paneKey: string) => void) => () => void
    onSpawnAgent: (callback: (args: DashboardSpawnAgentArgs) => void) => () => void
    onSleepWorkspace: (callback: (args: DashboardSleepWorkspaceArgs) => void) => () => void
    requestSnapshot: () => Promise<void>
    onSnapshot: (callback: (snapshot: DashboardSnapshot) => void) => () => void
    onViewRequested: (callback: (view: 'board' | 'map') => void) => () => void
    revealAgent: (args: DashboardRevealAgentArgs) => Promise<void>
    ackAgent: (paneKey: string) => Promise<void>
    spawnAgent: (args: DashboardSpawnAgentArgs) => Promise<void>
    sleepWorkspace: (args: DashboardSleepWorkspaceArgs) => Promise<void>
  }
  terminalPreview: {
    connect: (
      ptyId: string,
      opts?: { scrollbackRows?: number }
    ) => Promise<TerminalPreviewConnectResult>
    input: (ptyId: string, data: string) => Promise<boolean>
    /** Claim the PTY grid for the preview dialog; resolves to the size actually in effect. */
    fit: (
      ptyId: string,
      cols: number,
      rows: number
    ) => Promise<{ cols: number; rows: number } | null>
    ack: (ptyId: string, bytes: number) => Promise<void>
    unsubscribe: (ptyId: string) => Promise<void>
    onData: (callback: (payload: TerminalPreviewDataPayload) => void) => () => void
  }
  macosTccPrompts: {
    /** Fires once macOS has raised its Nth consent dialog naming Orca (#9756). */
    onThreshold: (callback: (payload: { promptCount: number }) => void) => () => void
    consumePending: () => Promise<{ claimId: number; promptCount: number } | null>
    acknowledgePending: (claimId: number) => Promise<void>
    releasePending: (claimId: number) => Promise<void>
    dismiss: () => Promise<void>
  }
  developerPermissions: {
    getStatus: () => Promise<DeveloperPermissionState[]>
    request: (args: { id: DeveloperPermissionId }) => Promise<DeveloperPermissionRequestResult>
    openSettings: (args: { id: DeveloperPermissionId }) => Promise<void>
    testLocalNetworkConnection: (args: {
      host: string
      port: number
    }) => Promise<LocalNetworkConnectionTestResult>
  }
  computerUsePermissions: {
    getStatus: () => Promise<ComputerUsePermissionStatusResult>
    openSetup: (args?: {
      id?: ComputerUsePermissionId
    }) => Promise<ComputerUsePermissionSetupResult>
    reset: () => Promise<ComputerUsePermissionResetResult>
  }
  tsserver: TsserverApi
  shell: {
    openPath: (path: string) => Promise<void>
    openInFileManager: (path: string) => Promise<ShellOpenLocalPathResult>
    openInExternalEditor: (
      request: ShellOpenExternalEditorRequest
    ) => Promise<ShellOpenExternalEditorResult>
    openUrl: (url: string) => Promise<void>
    openFilePath: (path: string) => Promise<boolean>
    openFileUri: (uri: string) => Promise<void>
    pathExists: (path: string) => Promise<boolean>
    pickAttachment: () => Promise<string | null>
    pickImage: () => Promise<string | null>
    pickRepoIconImage: () => Promise<{ dataUrl: string; fileName: string } | null>
    pickAudio: () => Promise<string | null>
    pickDirectory: (args: { defaultPath?: string }) => Promise<string | null>
    copyFile: (args: { srcPath: string; destPath: string }) => Promise<void>
  }
  skills: {
    discover: (target?: SkillDiscoveryTarget) => Promise<SkillDiscoveryResult>
    freshnessInventory: () => Promise<SkillFreshnessInventory>
    startUpdateRun: (names: string[]) => Promise<SkillUpdateStartResult>
    cancelUpdateRun: () => Promise<void>
    acknowledgeUpdateRun: () => Promise<void>
    getUpdateRun: () => Promise<SkillUpdateRun>
    onUpdateRun: (callback: (run: SkillUpdateRun) => void) => () => void
  }
  pet: {
    import: () => Promise<CustomPet | null>
    importPetBundle: () => Promise<CustomPet | null>
    read: (id: string, fileName: string, kind?: 'image' | 'bundle') => Promise<ArrayBuffer | null>
    delete: (id: string, fileName: string, kind?: 'image' | 'bundle') => Promise<void>
  }
>>>>>>> a115a8fb8b (feat(editor): add TypeScript language service)
  browser: BrowserApi
  emulator: EmulatorApi
  hooks: HooksApi
  ephemeralVm: EphemeralVmApi
  cache: WorkspaceSessionApi['cache']
  session: WorkspaceSessionApi['session']
  remoteWorkspace: WorkspaceSessionApi['remoteWorkspace']
  updater: UpdaterApi
  notebook: FilesystemApi['notebook']
  stats: StatsApi
  memory: MemoryApi
  claudeUsage: ClaudeUsageApi
  codexUsage: CodexUsageApi
  openCodeUsage: OpenCodeUsageApi
  aiVault: AiVaultApi
  nativeChat: NativeChatApi
  fs: FilesystemApi['fs']
  git: Merged<GitInspectionApi & GitOperationApi>
  ui: Merged<UiCommandEventApi & UiWindowApi>
  runtime: RuntimeApi['runtime']
  runtimeEnvironments: RuntimeApi['runtimeEnvironments']
  rateLimits: RateLimitsApi
  minimaxCredentials: MinimaxCredentialsApi
  grokAccounts: GrokAccountsApi
  ssh: SshApi
  automations: AutomationsApi
  wsl: RuntimeApi['wsl']
  pwsh: RuntimeApi['pwsh']
  gitBash: RuntimeApi['gitBash']
  plugins: PluginsApi
  agentStatus: AgentStatusApi
  mobile: MobileApi
  speech: SpeechApi
}

export type { ClaudeUsageApi, CodexUsageApi, OpenCodeUsageApi } from './api/agent-usage-api'
export type { AiVaultApi } from './api/ai-vault-api'
export type { AppApi } from './api/app-api'
export type { BrowserApi, DetectedBrowserInfo, DetectedBrowserProfileInfo } from './api/browser-api'
export type { EmulatorApi } from './api/emulator-api'
export type { ExportApi } from './api/filesystem-api'
export type {
  NativeChatApi,
  NativeChatAppendedMessages,
  NativeChatAppendedPayload,
  NativeChatReadSessionResult,
  NativeChatSubscribeArgs,
  NativeChatSubscriptionFrame
} from './api/native-chat-api'
export type {
  PluginHostInstallResult,
  PluginHostInstallSource,
  PluginHostListEntry,
  PluginHostLogLine,
  PluginHostPanel,
  PluginHostStatus,
  PluginMarketplaceHostInstallPreview,
  PluginMarketplaceHostListing,
  PluginMarketplaceHostSourceState
} from './api/plugin-host-api'
export type {
  PreflightApi,
  PreflightRuntimeContext,
  PreflightStatus,
  RefreshAgentsResult
} from './api/preflight-api'
export type {
  PtyManagementApi,
  PtyManagementMacTccAttributionHealth,
  PtyManagementSession
} from './api/pty-management-api'
export type {
  ShellOpenExternalEditorRequest,
  ShellOpenExternalEditorResult,
  ShellOpenLocalPathResult
} from './api/shell-api'
export type {
  DiagnosticsBundlePayload,
  DiagnosticsStatusPayload,
  DiagnosticsUploadPayload,
  MemoryApi,
  StatsApi
} from './api/telemetry-api'

declare global {
  // oxlint-disable-next-line typescript-eslint/consistent-type-definitions -- declaration merging requires interface
  interface Window {
    electron: ElectronAPI
    api: PreloadApi
  }
}
