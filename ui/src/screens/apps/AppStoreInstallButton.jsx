import { Check, Download, Square, Trash2 } from 'lucide-react'

const RING_LEN = 100

export default function AppStoreInstallButton({
  appLabel,
  installed,
  phase,
  onInstall,
  onUninstall,
}) {
  if (installed && phase !== 'uninstalling') {
    return (
      <button
        type="button"
        className="appstore-btn remove"
        disabled={phase === 'uninstalling'}
        onClick={onUninstall}
        aria-label={`Remove ${appLabel}`}
      >
        {phase === 'uninstalling' ? (
          <span className="appstore-btn-spinner" aria-hidden />
        ) : (
          <Trash2 size={16} />
        )}
      </button>
    )
  }

  if (phase === 'installing' || phase === 'complete') {
    return (
      <div
        className={`appstore-btn appstore-btn--installing ${phase === 'complete' ? 'appstore-btn--complete' : 'appstore-btn--ring-active'}`}
        role="status"
        aria-label={phase === 'complete' ? `${appLabel} installed` : `Installing ${appLabel}`}
      >
        <svg className="appstore-progress-ring" viewBox="0 0 36 36" aria-hidden>
          <circle className="appstore-progress-track" cx="18" cy="18" r="16" />
          <circle
            className="appstore-progress-fill"
            cx="18"
            cy="18"
            r="16"
            pathLength={RING_LEN}
          />
        </svg>
        <span className="appstore-btn-center" aria-hidden>
          {phase === 'complete' ? (
            <Check size={14} strokeWidth={3} />
          ) : (
            <Square size={10} fill="currentColor" strokeWidth={0} />
          )}
        </span>
      </div>
    )
  }

  return (
    <button
      type="button"
      className="appstore-btn"
      onClick={onInstall}
      aria-label={`Install ${appLabel}`}
    >
      <Download size={16} />
    </button>
  )
}
