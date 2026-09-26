import { PenLine, Send, Trash2 } from 'lucide-react'

export default function DocumentEditorActions({
  perms,
  signing,
  onSave,
  onSend,
  onDelete,
  onSign,
}) {
  if (!perms.canEdit && !perms.canSend && !perms.canDelete && !perms.canSign) {
    return null
  }

  return (
    <div className="doc-editor-actions doc-editor-actions-footer">
      {perms.canEdit && (
        <button type="button" className="phone-btn phone-btn-green" onClick={onSave}>
          <PenLine size={16} />
          Save draft
        </button>
      )}
      {perms.canSend && (
        <button type="button" className="phone-btn phone-btn-ghost doc-editor-secondary" onClick={onSend}>
          <Send size={16} />
          Send to player
        </button>
      )}
      {perms.canSign && (
        <button
          type="button"
          className="phone-btn phone-btn-green"
          onClick={onSign}
          disabled={signing}
        >
          {signing ? 'Signing…' : 'Sign document'}
        </button>
      )}
      {perms.canDelete && (
        <button type="button" className="phone-btn phone-btn-danger doc-editor-secondary" onClick={onDelete}>
          <Trash2 size={16} />
          Delete
        </button>
      )}
    </div>
  )
}
