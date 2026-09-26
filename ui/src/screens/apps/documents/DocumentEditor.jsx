import { useEffect, useMemo, useState } from 'react'
import AppScreen from '../../../components/AppScreen'
import { usePhone } from '../../../context/PhoneContext'
import RichTextEditor, { RichTextPreview } from './RichTextEditor'
import SendDocumentSheet from './SendDocumentSheet'
import DocumentStatusBanner from './DocumentStatusBanner'
import { getTemplateIcon } from './constants'
import {
  getDocumentPermissions,
  mergeDocumentContent,
  validateDocumentDraft,
} from './documentUtils'
import DocumentEditorActions from './DocumentEditorActions'
import DocumentFieldInput from './DocumentFieldInput'

export default function DocumentEditor({
  document: initial,
  categories = [],
  onBack,
  onSave,
  onDelete,
  onSend,
  onSign,
}) {
  const { notify } = usePhone()
  const [draft, setDraft] = useState({ ...initial })
  const [mode, setMode] = useState(initial.isRecipient ? 'preview' : 'edit')

  useEffect(() => {
    setDraft({ ...initial })
    if (initial.isRecipient || (initial.status && initial.status !== 'draft')) {
      setMode('preview')
    }
  }, [initial])
  const [showSendSheet, setShowSendSheet] = useState(false)
  const [sending, setSending] = useState(false)
  const [signing, setSigning] = useState(false)

  const fields = draft.templateFields || []
  const perms = useMemo(() => getDocumentPermissions(draft), [draft])
  const iconMeta = getTemplateIcon(draft.templateIcon || 'document')
  const previewHtml = useMemo(() => mergeDocumentContent(draft), [draft])

  const setFieldValue = (fieldId, value) => {
    setDraft((prev) => ({
      ...prev,
      fieldValues: { ...prev.fieldValues, [fieldId]: value },
    }))
  }

  const buildSavePayload = () => ({
    ...draft,
    content: mergeDocumentContent(draft),
  })

  const handleSave = async () => {
    const validation = validateDocumentDraft(draft)
    if (!validation.ok) {
      notify('Documents', validation.message, 'error')
      return
    }
    await onSave(buildSavePayload())
  }

  const handleSendClick = async () => {
    if (!draft.id) {
      const validation = validateDocumentDraft(draft)
      if (!validation.ok) {
        notify('Documents', validation.message, 'error')
        return
      }
      const saveRes = await onSave(buildSavePayload())
      if (!saveRes?.ok) return
      if (saveRes.document) setDraft(saveRes.document)
    }
    const validation = validateDocumentDraft(draft, { forSend: true })
    if (!validation.ok) {
      notify('Documents', validation.message, 'error')
      return
    }
    setShowSendSheet(true)
  }

  const handleSend = async (targetId) => {
    if (!draft.id || sending) return
    setSending(true)
    try {
      const res = await onSend(draft.id, targetId)
      if (res?.ok) setShowSendSheet(false)
      return res
    } finally {
      setSending(false)
    }
  }

  const handleSign = async () => {
    if (!draft.id || signing) return
    setSigning(true)
    try {
      return await onSign(draft.id)
    } finally {
      setSigning(false)
    }
  }

  const sendLayer = showSendSheet ? (
    <SendDocumentSheet
      title={draft.title}
      icon={draft.templateIcon || 'document'}
      loading={sending}
      onClose={() => !sending && setShowSendSheet(false)}
      onSend={handleSend}
    />
  ) : null

  const editorFields = (
    <>
      <DocumentStatusBanner draft={draft} partyName={draft.partyName} />
      <div className="phone-form-group">
        <label>Title</label>
        <input
          value={draft.title}
          onChange={(e) => setDraft({ ...draft, title: e.target.value })}
          placeholder="Document title"
          readOnly={perms.isReadOnly}
        />
      </div>
      {categories.length > 0 && perms.canEdit && (
        <div className="phone-form-group">
          <label>Category</label>
          <select
            value={draft.category}
            onChange={(e) => setDraft({ ...draft, category: e.target.value })}
          >
            {categories.filter((c) => c.id !== 'all').map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
        </div>
      )}
      {fields.map((field) => (
        <div key={field.id} className="phone-form-group">
          <label>{field.label || 'Field'}{field.required ? ' *' : ''}</label>
          <DocumentFieldInput
            field={field}
            value={draft.fieldValues?.[field.id] || ''}
            onChange={(val) => setFieldValue(field.id, val)}
            readOnly={perms.isReadOnly}
          />
        </div>
      ))}
      {!fields.length && perms.canEdit && (
        <>
          <p className="phone-section-label">Content</p>
          <RichTextEditor
            value={draft.content}
            onChange={(content) => setDraft({ ...draft, content })}
            placeholder="Document content..."
          />
        </>
      )}
    </>
  )

  const previewPanel = (
    <div className="doc-preview-panel">
      <DocumentStatusBanner draft={draft} partyName={draft.partyName} />
      <div className="doc-preview-card">
        <div className="doc-preview-card-icon">
          <iconMeta.Icon size={22} />
        </div>
        <span>{draft.title || 'Untitled Document'}</span>
      </div>
      <p className="phone-section-label">Content</p>
      <div className="doc-preview-content-box">
        <RichTextPreview html={previewHtml} emptyText="No content." />
      </div>
    </div>
  )

  return (
    <AppScreen
      className={`documents-app${showSendSheet ? ' documents-app-modal-open' : ''}`}
      title={draft.id ? draft.title || 'Document' : 'New Document'}
      onBack={onBack}
      tabStyle="sub"
      tabs={[
        { id: 'edit', label: perms.isReadOnly ? 'Details' : 'Edit' },
        { id: 'preview', label: 'Preview' },
      ]}
      activeTab={mode}
      onTabChange={setMode}
      layer={sendLayer}
      footer={
        <DocumentEditorActions
          perms={perms}
          saving={false}
          signing={signing}
          onSave={handleSave}
          onSend={handleSendClick}
          onDelete={() => onDelete(draft.id)}
          onSign={handleSign}
        />
      }
    >
      {mode === 'edit' ? <div className="doc-editor-form">{editorFields}</div> : previewPanel}
    </AppScreen>
  )
}
