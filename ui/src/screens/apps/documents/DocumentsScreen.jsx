import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Inbox,
  Bell,
  FileText,
  Search,
  ChevronDown,
  FilePlus,
  Wallet,
} from 'lucide-react'
import AppScreen from '../../../components/AppScreen'
import FoldEmpty from '../../../components/FoldEmpty'
import FoldSplit from '../../../components/FoldSplit'
import { usePhone } from '../../../context/PhoneContext'
import { fetchNui } from '../../../hooks/useNui'
import TemplateEditor from './TemplateEditor'
import DocumentEditor from './DocumentEditor'
import { DOC_TABS, emptyDocument, emptyTemplate, getTemplateIcon } from './constants'
import { documentStatusBadgeClass, documentStatusLabel, sendErrorMessage } from './documentUtils'
import WalletTab from './WalletTab'

const TAB_ICONS = {
  inbox: Inbox,
  notifications: Bell,
  templates: FileText,
  wallet: Wallet,
}

const TAB_TITLES = {
  inbox: 'Documents',
  notifications: 'Notifications',
  templates: 'Templates',
  wallet: 'Wallet',
}

export default function DocumentsScreen() {
  const { goBack, notify, bootstrap, phoneFlipped, foldLayout } = usePhone()
  const folded = phoneFlipped && foldLayout?.mode === 'span'
  const categories = bootstrap?.docCategories || [{ id: 'all', label: 'All' }]

  const [tab, setTab] = useState('inbox')
  const [documents, setDocuments] = useState([])
  const [templates, setTemplates] = useState([])
  const [notifications, setNotifications] = useState([])
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [filterOpen, setFilterOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState(null)
  const [editingDocument, setEditingDocument] = useState(null)

  const loadDocuments = useCallback(() => fetchNui('getDocuments').then((d) => setDocuments(d || [])), [])
  const loadTemplates = useCallback(() => fetchNui('getDocTemplates').then((d) => setTemplates(d || [])), [])
  const loadNotifications = useCallback(() => fetchNui('getDocNotifications').then((d) => setNotifications(d || [])), [])

  const refresh = useCallback(() => {
    if (tab === 'inbox') loadDocuments()
    else if (tab === 'templates') loadTemplates()
    else loadNotifications()
  }, [tab, loadDocuments, loadTemplates, loadNotifications])

  useEffect(() => {
    refresh()
  }, [refresh])

  const filteredDocuments = useMemo(() => {
    let list = documents
    const q = search.trim().toLowerCase()
    if (q) list = list.filter((d) => (d.title || '').toLowerCase().includes(q))
    if (filter === 'sent') list = list.filter((d) => d.isOwner && d.status === 'sent')
    else if (filter === 'received') list = list.filter((d) => d.isRecipient)
    else if (filter === 'draft') list = list.filter((d) => d.status === 'draft')
    else if (filter === 'signed') list = list.filter((d) => d.signed)
    else if (filter !== 'all') list = list.filter((d) => d.category === filter)
    return list
  }, [documents, search, filter])

  const premadeTemplates = useMemo(() => templates.filter((t) => t.isPremade), [templates])
  const customTemplates = useMemo(() => templates.filter((t) => !t.isPremade), [templates])
  const filteredPremade = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return premadeTemplates
    return premadeTemplates.filter(
      (t) =>
        (t.name || '').toLowerCase().includes(q) ||
        (t.description || '').toLowerCase().includes(q),
    )
  }, [premadeTemplates, search])
  const filteredCustom = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return customTemplates
    return customTemplates.filter(
      (t) =>
        (t.name || '').toLowerCase().includes(q) ||
        (t.description || '').toLowerCase().includes(q),
    )
  }, [customTemplates, search])

  const filterLabel = categories.find((c) => c.id === filter)?.label || 'All'
  const templateCount = filteredPremade.length + filteredCustom.length
  const filterCount = tab === 'inbox' ? filteredDocuments.length : tab === 'templates' ? templateCount : notifications.length

  const openNewTemplate = () => setEditingTemplate(emptyTemplate())
  const openNewDocument = () => setEditingDocument(emptyDocument())

  const openTemplate = (t) => {
    if (t.isPremade) return
    setEditingTemplate({
      id: t.id,
      name: t.name,
      description: t.description || '',
      icon: t.icon || 'document',
      fields: t.fields || [],
      requiresSignature: t.requiresSignature,
      baseContent: t.baseContent || '',
    })
  }

  const mapDocumentFromServer = (d) => ({
    id: d.id,
    templateId: d.template_id,
    title: d.title,
    category: d.category,
    status: d.status,
    fieldValues: d.fieldValues || {},
    content: d.content || '',
    requiresSignature: d.requiresSignature,
    signed: d.signed,
    isOwner: d.isOwner,
    isRecipient: d.isRecipient,
    templateFields: d.templateFields || [],
    templateBaseContent: d.templateBaseContent || '',
    templateIcon: d.templateIcon || d.template_icon || 'document',
    partyName: d.partyName || '',
  })

  const openDocument = async (id) => {
    const res = await fetchNui('getDocument', { id })
    if (res?.document) {
      setEditingDocument(mapDocumentFromServer(res.document))
    } else {
      notify('Documents', 'Document not found', 'error')
    }
  }

  const saveTemplate = async (draft) => {
    if (!(draft.name || '').trim()) {
      notify('Documents', 'Template name is required', 'error')
      return
    }
    const res = await fetchNui('saveDocTemplate', draft)
    if (res?.ok) {
      notify('Documents', 'Template saved', 'default')
      setEditingTemplate(null)
      loadTemplates()
    } else {
      notify('Documents', 'Could not save template', 'error')
    }
  }

  const deleteTemplate = async (id) => {
    await fetchNui('deleteDocTemplate', { id })
    setEditingTemplate(null)
    loadTemplates()
    notify('Documents', 'Template deleted', 'default')
  }

  const saveDocument = async (draft) => {
    const res = await fetchNui('saveDocument', {
      id: draft.id,
      templateId: draft.templateId,
      title: draft.title,
      category: draft.category,
      fieldValues: draft.fieldValues,
      content: draft.content,
      requiresSignature: draft.requiresSignature,
    })
    if (res?.ok) {
      notify('Documents', 'Document saved', 'default')
      const docId = res.id || draft.id
      let mapped = null
      if (docId) {
        const refreshed = await fetchNui('getDocument', { id: docId })
        if (refreshed?.document) {
          mapped = mapDocumentFromServer(refreshed.document)
          setEditingDocument(mapped)
        }
      }
      loadDocuments()
      return { ok: true, id: docId, document: mapped }
    }
    notify('Documents', sendErrorMessage(res?.error), 'error')
    return { ok: false }
  }

  const deleteDocument = async (id) => {
    const res = await fetchNui('deleteDocument', { id })
    if (res?.ok) {
      setEditingDocument(null)
      loadDocuments()
      notify('Documents', 'Document deleted', 'default')
    } else {
      notify('Documents', sendErrorMessage(res?.error), 'error')
    }
  }

  const sendDocument = async (id, targetId) => {
    const res = await fetchNui('sendDocument', { id, targetId: parseInt(targetId, 10) })
    if (res?.ok) {
      const who = res.recipientName ? ` to ${res.recipientName}` : ''
      notify('Documents', `Document sent${who}`, 'default')
      const refreshed = await fetchNui('getDocument', { id })
      if (refreshed?.document) {
        setEditingDocument(mapDocumentFromServer(refreshed.document))
      }
      loadDocuments()
      loadNotifications()
      return { ok: true }
    }
    notify('Documents', sendErrorMessage(res?.error, res?.field), 'error')
    return { ok: false }
  }

  const signDocument = async (id) => {
    const res = await fetchNui('signDocument', { id })
    if (res?.ok) {
      notify('Documents', 'Document signed', 'default')
      const refreshed = await fetchNui('getDocument', { id })
      if (refreshed?.document) {
        setEditingDocument(mapDocumentFromServer(refreshed.document))
      }
      loadDocuments()
      loadNotifications()
      return { ok: true }
    }
    notify('Documents', sendErrorMessage(res?.error), 'error')
    return { ok: false }
  }

  const composeFromTemplate = (t) => {
    setEditingDocument(emptyDocument({
      templateId: t.id,
      name: t.name,
      category: t.category,
      fields: t.fields,
      requiresSignature: t.requiresSignature,
      baseContent: t.baseContent,
      templateIcon: t.icon,
    }))
    setTab('inbox')
  }

  const markNotificationRead = async (n) => {
    await fetchNui('markDocNotificationRead', { id: n.id })
    if (n.document_id) openDocument(n.document_id)
    loadNotifications()
  }

  const headerAction = () => {
    if (tab === 'notifications' || tab === 'wallet') return null
    return (
      <button
        type="button"
        className="doc-header-add"
        onClick={tab === 'templates' ? openNewTemplate : openNewDocument}
        aria-label={tab === 'templates' ? 'New template' : 'New document'}
      >
        <FilePlus size={20} strokeWidth={2} />
      </button>
    )
  }

  const editor = editingTemplate ? (
    <TemplateEditor
      template={editingTemplate}
      onBack={() => setEditingTemplate(null)}
      onSave={saveTemplate}
      onDelete={editingTemplate.id ? deleteTemplate : null}
    />
  ) : editingDocument ? (
    <DocumentEditor
      document={editingDocument}
      categories={categories}
      onBack={() => setEditingDocument(null)}
      onSave={saveDocument}
      onDelete={deleteDocument}
      onSend={sendDocument}
      onSign={signDocument}
    />
  ) : null

  if (editor && !folded) return editor

  const library = (
    <AppScreen
      className="documents-app"
      title={TAB_TITLES[tab]}
      onBack={goBack}
      headerRight={headerAction()}
      tabs={DOC_TABS.map((t) => ({ ...t, icon: TAB_ICONS[t.id] }))}
      activeTab={tab}
      onTabChange={(id) => {
        setTab(id)
        setSearch('')
        setFilter('all')
      }}
    >
      {tab !== 'notifications' && tab !== 'wallet' && (
        <>
          <div className="doc-search-wrap">
            <input
              className="doc-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={tab === 'templates' ? 'Search templates' : 'Search documents'}
            />
            <Search size={18} className="doc-search-icon" />
          </div>
          {tab === 'inbox' && (
            <button type="button" className="doc-filter-bar" onClick={() => setFilterOpen((o) => !o)}>
              <span>{filterLabel}</span>
              <span className="doc-filter-meta">
                {filterCount}
                <ChevronDown size={16} className={filterOpen ? 'open' : ''} />
              </span>
            </button>
          )}
          {tab === 'inbox' && filterOpen && (
            <div className="doc-filter-menu">
              {[
                { id: 'all', label: 'All' },
                { id: 'draft', label: 'Drafts' },
                { id: 'sent', label: 'Sent' },
                { id: 'received', label: 'Received' },
                { id: 'signed', label: 'Signed' },
                ...categories.filter((c) => c.id !== 'all'),
              ].map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={filter === c.id ? 'active' : ''}
                  onClick={() => {
                    setFilter(c.id)
                    setFilterOpen(false)
                  }}
                >
                  {c.label}
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'inbox' && (
        filteredDocuments.length === 0 ? (
          <div className="phone-empty">
            <Inbox size={48} />
            <p>No documents yet</p>
          </div>
        ) : (
          filteredDocuments.map((doc) => {
            const icon = getTemplateIcon(doc.templateIcon || doc.template_icon || 'document')
            const statusLabel = documentStatusLabel(doc, doc.partyName)
            const badgeClass = documentStatusBadgeClass(doc)
            return (
              <button key={doc.id} type="button" className="doc-list-item" onClick={() => openDocument(doc.id)}>
                <div className="doc-list-icon">
                  <icon.Icon size={20} />
                </div>
                <div className="doc-list-body">
                  <div className="doc-list-title-row">
                    <h3>{doc.title}</h3>
                    <span className={`phone-badge ${badgeClass}`}>{statusLabel}</span>
                  </div>
                  <p>
                    {doc.isOwner
                      ? (doc.status === 'sent' && doc.partyName ? `To ${doc.partyName}` : doc.category)
                      : `From ${doc.partyName || 'Unknown'}`}
                  </p>
                  <span className="phone-card-meta">{doc.timeAgo}</span>
                </div>
                {!doc.read && doc.isRecipient && <span className="doc-unread-dot" />}
              </button>
            )
          })
        )
      )}

      {tab === 'notifications' && (
        notifications.length === 0 ? (
          <div className="phone-empty">
            <Bell size={48} />
            <p>No notifications</p>
          </div>
        ) : (
          notifications.map((n) => (
            <button
              key={n.id}
              type="button"
              className={`doc-list-item ${n.read ? '' : 'unread'}`}
              onClick={() => markNotificationRead(n)}
            >
              <div className="doc-list-icon">
                <Bell size={20} />
              </div>
              <div className="doc-list-body">
                <h3>{n.title}</h3>
                <p>{n.body}</p>
                <span className="phone-card-meta">{n.timeAgo}</span>
              </div>
            </button>
          ))
        )
      )}

      {tab === 'wallet' && <WalletTab />}

      {tab === 'templates' && (
        templateCount === 0 ? (
          <div className="phone-empty">
            <FileText size={48} />
            <p>No templates yet</p>
          </div>
        ) : (
          <>
            {filteredPremade.length > 0 && (
              <>
                <p className="phone-section-label">Starter templates</p>
                {filteredPremade.map((t) => {
                  const icon = getTemplateIcon(t.icon)
                  return (
                    <div key={t.id} className="doc-template-row">
                      <div className="doc-list-item doc-list-item-static">
                        <div className="doc-list-icon">
                          <icon.Icon size={20} />
                        </div>
                        <div className="doc-list-body">
                          <div className="doc-list-title-row">
                            <h3>{t.name}</h3>
                            <span className="phone-badge phone-badge-open">Starter</span>
                          </div>
                          {t.description && <p>{t.description}</p>}
                        </div>
                      </div>
                      <button type="button" className="doc-use-template-btn" onClick={() => composeFromTemplate(t)}>
                        Use
                      </button>
                    </div>
                  )
                })}
              </>
            )}
            {filteredCustom.length > 0 && (
              <>
                {filteredPremade.length > 0 && <p className="phone-section-label">My templates</p>}
                {filteredCustom.map((t) => {
                  const icon = getTemplateIcon(t.icon)
                  return (
                    <div key={t.id} className="doc-template-row">
                      <button type="button" className="doc-list-item" onClick={() => openTemplate(t)}>
                        <div className="doc-list-icon">
                          <icon.Icon size={20} />
                        </div>
                        <div className="doc-list-body">
                          <h3>{t.name}</h3>
                          {t.description && <p>{t.description}</p>}
                          <span className="phone-card-meta">{t.timeAgo}</span>
                        </div>
                      </button>
                      <button type="button" className="doc-use-template-btn" onClick={() => composeFromTemplate(t)}>
                        Use
                      </button>
                    </div>
                  )
                })}
              </>
            )}
          </>
        )
      )}
    </AppScreen>
  )

  if (folded) {
    return (
      <FoldSplit
        menu={library}
        detail={editor || <FoldEmpty title="Select a document" subtitle="Files and templates you open show up here." />}
      />
    )
  }

  return library
}
