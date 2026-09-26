export default function GalleryConfirmDialog({ title, message, confirmLabel, onCancel, onConfirm, busy, danger }) {
  return (
    <div className="glry-dialog-root" role="presentation">
      <button type="button" className="glry-sheet-backdrop" onClick={onCancel} aria-label="Cancel" />
      <div className="glry-dialog glry-dialog-confirm" role="alertdialog" aria-label={title}>
        <h3>{title}</h3>
        <p>{message}</p>
        <div className="glry-dialog-actions">
          <button type="button" className="glry-dialog-btn glry-dialog-btn-muted" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button
            type="button"
            className={`glry-dialog-btn ${danger ? 'glry-dialog-btn-danger' : 'glry-dialog-btn-primary'}`}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? 'Please wait…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
