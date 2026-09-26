export const SEND_ERROR_MESSAGES = {
  invalid_target: 'Enter a valid player ID or pick a contact.',
  offline: 'That player is not online.',
  self: 'You cannot send a document to yourself.',
  not_found: 'Document not found.',
  not_draft: 'Only draft documents can be sent.',
  missing_title: 'Add a document title before sending.',
  missing_field: 'Fill in all required fields before sending.',
  forbidden: 'You cannot edit this document.',
  signed: 'Signed documents cannot be deleted.',
  rate_limit: 'Too many requests — try again shortly.',
  no_signature: 'This document does not require a signature.',
  already_signed: 'This document is already signed.',
  missing_name: 'Template name is required.',
}

export function sendErrorMessage(error, fallbackField) {
  if (error === 'missing_field' && fallbackField) {
    return `Required field: ${fallbackField}`
  }
  return SEND_ERROR_MESSAGES[error] || 'Something went wrong.'
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function mergeDocumentContent(draft) {
  const fields = draft.templateFields || []
  let html = draft.templateBaseContent || draft.content || ''
  Object.entries(draft.fieldValues || {}).forEach(([id, val]) => {
    if (val === undefined || val === null || val === '') return
    const label = fields.find((f) => f.id === id)?.label || id
    html += `<p><strong>${escapeHtml(label)}:</strong> ${escapeHtml(String(val))}</p>`
  })
  return html.trim()
}

export function validateDocumentDraft(draft, { forSend = false } = {}) {
  const title = (draft.title || '').trim()
  if (!title) {
    return { ok: false, error: 'missing_title', message: SEND_ERROR_MESSAGES.missing_title }
  }

  const fields = draft.templateFields || []
  for (const field of fields) {
    if (!field.required) continue
    const val = draft.fieldValues?.[field.id]
    if (val === undefined || val === null || String(val).trim() === '') {
      return {
        ok: false,
        error: 'missing_field',
        field: field.label || 'Field',
        message: `Required field: ${field.label || 'Field'}`,
      }
    }
  }

  if (forSend && !fields.length) {
    const content = mergeDocumentContent(draft)
    if (!content) {
      return { ok: false, error: 'missing_field', message: 'Add document content before sending.' }
    }
  }

  return { ok: true }
}

export function getDocumentPermissions(draft) {
  const isRecipient = !!draft.isRecipient
  const isOwner = !isRecipient && draft.isOwner !== false
  const status = draft.status || 'draft'
  const signed = !!draft.signed

  const canEdit = isOwner && status === 'draft' && !signed
  const canSend = isOwner && status === 'draft' && !!draft.id && !signed
  const canDelete = isOwner && !signed && (status === 'draft' || status === 'sent')
  const canSign = isRecipient && !!draft.requiresSignature && !signed && status === 'sent'

  return {
    isOwner,
    isRecipient,
    status,
    signed,
    canEdit,
    canSend,
    canDelete,
    canSign,
    isReadOnly: !canEdit,
  }
}

export function documentStatusLabel(draft, partyName) {
  const { status, signed, isOwner, isRecipient } = getDocumentPermissions(draft)
  if (signed) return 'Signed'
  if (status === 'sent' && isOwner) return partyName ? `Sent to ${partyName}` : 'Sent'
  if (status === 'sent' && isRecipient) return partyName ? `From ${partyName}` : 'Received'
  if (isRecipient) return partyName ? `From ${partyName}` : 'Received'
  return 'Draft'
}

export function documentStatusBadgeClass(draft) {
  const { status, signed } = getDocumentPermissions(draft)
  if (signed) return 'phone-badge-paid'
  if (status === 'sent') return 'phone-badge-pending'
  return 'phone-badge-open'
}
