import { useState } from 'react'
import { ChevronDown, Plus, Trash2 } from 'lucide-react'
import AppScreen from '../../../components/AppScreen'
import RichTextEditor, { RichTextPreview } from './RichTextEditor'
import { FIELD_TYPES, TEMPLATE_ICONS, getTemplateIcon, newFieldId } from './constants'

export default function TemplateEditor({ template, onBack, onSave, onDelete }) {
  const [draft, setDraft] = useState({ ...template })
  const [mode, setMode] = useState('edit')
  const [iconOpen, setIconOpen] = useState(false)
  const iconMeta = getTemplateIcon(draft.icon)

  const updateField = (fieldId, patch) => {
    setDraft((prev) => ({
      ...prev,
      fields: prev.fields.map((f) => (f.id === fieldId ? { ...f, ...patch } : f)),
    }))
  }

  const addField = () => {
    setDraft((prev) => ({
      ...prev,
      fields: [...prev.fields, { id: newFieldId(), label: '', type: 'text', required: false }],
    }))
  }

  const removeField = (fieldId) => {
    setDraft((prev) => ({
      ...prev,
      fields: prev.fields.filter((f) => f.id !== fieldId),
    }))
  }

  const handleSave = () => onSave(draft)

  const previewTitle = draft.name?.trim() || 'Untitled Template'
  const hasFields = draft.fields.length > 0

  return (
    <AppScreen
      className="documents-app"
      title={draft.id ? 'Edit Template' : 'New Template'}
      onBack={onBack}
      tabStyle="sub"
      tabs={[
        { id: 'edit', label: 'Edit' },
        { id: 'preview', label: 'Preview' },
      ]}
      activeTab={mode}
      onTabChange={setMode}
    >
      {mode === 'edit' ? (
        <div className="doc-editor-form">
          <div className="phone-form-group">
            <label>Name</label>
            <input
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              placeholder="e.g., Traffic Citation"
            />
          </div>
          <div className="phone-form-group">
            <label>Description (optional)</label>
            <input
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              placeholder="Briefly describe this template"
            />
          </div>
          <div className="phone-form-group">
            <label>Icon</label>
            <div className="doc-icon-select">
              <button
                type="button"
                className="doc-icon-select-btn"
                onClick={() => setIconOpen((o) => !o)}
              >
                <iconMeta.Icon size={18} />
                <span>{iconMeta.label}</span>
                <ChevronDown size={16} />
              </button>
              {iconOpen && (
                <div className="doc-icon-select-menu">
                  {TEMPLATE_ICONS.map(({ id, label, Icon }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => {
                        setDraft({ ...draft, icon: id })
                        setIconOpen(false)
                      }}
                    >
                      <Icon size={16} />
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="doc-fields-header">
            <span className="phone-section-label" style={{ margin: 0 }}>Form fields</span>
            <button type="button" className="doc-add-field-btn" onClick={addField}>
              <Plus size={14} />
              Add Field
            </button>
          </div>
          {draft.fields.length === 0 ? (
            <p className="doc-hint">
              No fields yet. Fields are shown when composing a document from this template.
            </p>
          ) : (
            draft.fields.map((field) => (
              <div key={field.id} className="doc-field-row">
                <input
                  value={field.label}
                  onChange={(e) => updateField(field.id, { label: e.target.value })}
                  placeholder="Field label"
                />
                <select
                  value={field.type}
                  onChange={(e) => updateField(field.id, { type: e.target.value })}
                >
                  {FIELD_TYPES.map((t) => (
                    <option key={t.id} value={t.id}>{t.label}</option>
                  ))}
                </select>
                <label className="doc-field-required">
                  <input
                    type="checkbox"
                    checked={field.required}
                    onChange={(e) => updateField(field.id, { required: e.target.checked })}
                  />
                  Req.
                </label>
                <button type="button" className="doc-field-remove" onClick={() => removeField(field.id)} aria-label="Remove field">
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}

          <div className="doc-toggle-row">
            <span>Requires signature</span>
            <button
              type="button"
              className={`doc-toggle ${draft.requiresSignature ? 'on' : ''}`}
              onClick={() => setDraft({ ...draft, requiresSignature: !draft.requiresSignature })}
              aria-pressed={draft.requiresSignature}
            >
              <span className="doc-toggle-thumb" />
            </button>
          </div>

          <p className="phone-section-label">Base content</p>
          <RichTextEditor
            value={draft.baseContent}
            onChange={(baseContent) => setDraft({ ...draft, baseContent })}
            placeholder="Enter default template content..."
          />

          <button type="button" className="phone-btn phone-btn-green" style={{ marginTop: 16 }} onClick={handleSave}>
            Save template
          </button>
          {draft.id && onDelete && (
            <button type="button" className="phone-btn phone-btn-danger" style={{ marginTop: 8 }} onClick={() => onDelete(draft.id)}>
              Delete template
            </button>
          )}
        </div>
      ) : (
        <div className="doc-preview-panel">
          <div className="doc-preview-card">
            <div className="doc-preview-card-icon">
              <iconMeta.Icon size={22} />
            </div>
            <span>{previewTitle}</span>
          </div>
          <p className="doc-hint">
            {hasFields
              ? `${draft.fields.length} form field${draft.fields.length === 1 ? '' : 's'} will be shown when composing.`
              : 'No form fields — document will open directly with base content.'}
          </p>
          {hasFields && (
            <ul className="doc-preview-fields-list">
              {draft.fields.map((f) => (
                <li key={f.id}>{f.label || 'Untitled field'}{f.required ? ' *' : ''}</li>
              ))}
            </ul>
          )}
          <p className="phone-section-label">Base content</p>
          <div className="doc-preview-content-box">
            <RichTextPreview html={draft.baseContent} />
          </div>
        </div>
      )}
    </AppScreen>
  )
}
