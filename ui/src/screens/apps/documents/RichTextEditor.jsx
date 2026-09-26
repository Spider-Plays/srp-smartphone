import { useEffect, useRef } from 'react'
import { Bold, Italic, Underline, List, ListOrdered } from 'lucide-react'

export default function RichTextEditor({ value, onChange, placeholder }) {
  const editorRef = useRef(null)

  const exec = (cmd, val = null) => {
    editorRef.current?.focus()
    document.execCommand(cmd, false, val)
    onChange(editorRef.current?.innerHTML || '')
  }

  const handleInput = () => {
    onChange(editorRef.current?.innerHTML || '')
  }

  useEffect(() => {
    const el = editorRef.current
    if (!el || document.activeElement === el) return
    if ((el.innerHTML || '') !== (value || '')) {
      el.innerHTML = value || ''
    }
  }, [value])

  return (
    <div className="doc-rich-editor">
      <div className="doc-rich-toolbar" role="toolbar" aria-label="Formatting">
        <button type="button" onClick={() => exec('formatBlock', 'h1')} title="Heading 1">H1</button>
        <button type="button" onClick={() => exec('formatBlock', 'h2')} title="Heading 2">H2</button>
        <button type="button" onClick={() => exec('bold')} title="Bold"><Bold size={14} /></button>
        <button type="button" onClick={() => exec('italic')} title="Italic"><Italic size={14} /></button>
        <button type="button" onClick={() => exec('underline')} title="Underline"><Underline size={14} /></button>
        <button type="button" onClick={() => exec('insertUnorderedList')} title="Bullet list"><List size={14} /></button>
        <button type="button" onClick={() => exec('insertOrderedList')} title="Numbered list"><ListOrdered size={14} /></button>
      </div>
      <div
        ref={editorRef}
        className="doc-rich-area"
        contentEditable
        role="textbox"
        aria-multiline="true"
        data-placeholder={placeholder}
        onInput={handleInput}
        suppressContentEditableWarning
      />
    </div>
  )
}

export function RichTextPreview({ html, emptyText = 'No base content set.' }) {
  const trimmed = (html || '').replace(/<[^>]+>/g, '').trim()
  if (!trimmed) {
    return <p className="doc-preview-empty">{emptyText}</p>
  }
  return <div className="doc-rich-preview" dangerouslySetInnerHTML={{ __html: html }} />
}
