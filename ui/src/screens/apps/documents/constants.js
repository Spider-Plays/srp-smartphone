import {
  FileText,
  FileCheck,
  FileWarning,
  ClipboardList,
  Scale,
  Stethoscope,
  Briefcase,
} from 'lucide-react'

export const DOC_TABS = [
  { id: 'inbox', label: 'Inbox' },
  { id: 'wallet', label: 'Wallet' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'templates', label: 'Templates' },
]

export const TEMPLATE_ICONS = [
  { id: 'document', label: 'Document', Icon: FileText },
  { id: 'contract', label: 'Contract', Icon: FileCheck },
  { id: 'citation', label: 'Citation', Icon: FileWarning },
  { id: 'form', label: 'Form', Icon: ClipboardList },
  { id: 'legal', label: 'Legal', Icon: Scale },
  { id: 'medical', label: 'Medical', Icon: Stethoscope },
  { id: 'business', label: 'Business', Icon: Briefcase },
]

export const FIELD_TYPES = [
  { id: 'text', label: 'Text' },
  { id: 'number', label: 'Number' },
  { id: 'date', label: 'Date' },
  { id: 'textarea', label: 'Long text' },
]

export function emptyTemplate() {
  return {
    id: null,
    name: '',
    description: '',
    icon: 'document',
    fields: [],
    requiresSignature: false,
    baseContent: '',
  }
}

export function emptyDocument(template) {
  const premadeId = template?.templateId ?? template?.id ?? null
  const numericTemplateId =
    premadeId != null && !String(premadeId).startsWith('premade:') ? premadeId : null
  return {
    id: null,
    templateId: numericTemplateId,
    premadeSlug: String(premadeId || '').startsWith('premade:') ? String(premadeId).replace('premade:', '') : null,
    isOwner: true,
    isRecipient: false,
    title: template?.name ? `${template.name}` : 'Untitled Document',
    category: template?.category || 'general',
    status: 'draft',
    fieldValues: {},
    content: template?.baseContent || '',
    requiresSignature: template?.requiresSignature || false,
    templateFields: template?.fields || [],
    templateBaseContent: template?.baseContent || '',
  }
}

export function getTemplateIcon(iconId) {
  return TEMPLATE_ICONS.find((i) => i.id === iconId) || TEMPLATE_ICONS[0]
}

export function newFieldId() {
  return `field_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}
