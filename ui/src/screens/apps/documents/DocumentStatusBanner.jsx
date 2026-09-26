import { getDocumentPermissions, documentStatusLabel } from './documentUtils'

export default function DocumentStatusBanner({ draft, partyName }) {
  const perms = getDocumentPermissions(draft)
  const label = documentStatusLabel(draft, partyName)

  return (
    <div className={`doc-status-banner doc-status-${perms.signed ? 'signed' : perms.status}`}>
      <span className="doc-status-label">{label}</span>
      {perms.canSign && <span className="doc-status-pill">Signature required</span>}
      {perms.isReadOnly && !perms.canSign && (
        <span className="doc-status-pill muted">View only</span>
      )}
    </div>
  )
}
