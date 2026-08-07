export function AsanaIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="currentColor">
      {/* Why: flatten the official Asana three-dot mark to monochrome so it matches
      Orca's other provider icons instead of rendering as a branded gradient. */}
      <ellipse cx="12" cy="5.9" rx="4.75" ry="4.6" />
      <ellipse cx="5.35" cy="17.05" rx="4.75" ry="4.6" />
      <ellipse cx="18.65" cy="17.05" rx="4.75" ry="4.6" />
    </svg>
  )
}
