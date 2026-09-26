import LifeInvaderAppIcon from '../screens/apps/lifeinvader/LifeInvaderAppIcon'
import { SOCIAL_APP_NAME } from './socialAppBranding'
import {
  MessageCircle,
  Phone,
  Settings,
  Image,
  Landmark,
  Car,
  Building2,
  Bird,
  Camera,
  Map,
  Briefcase,
  Mail,
  Wrench,
  Bell,
  StickyNote,
  FileText,
  Calculator,
  Newspaper,
  Files,
  TrendingUp,
  CloudSun,
  HandCoins,
  Building,
  Skull,
  Calendar,
  Radio,
  Store,
} from 'lucide-react'

/** Sort apps A–Z by display label. */
export function sortAppsByLabel(apps) {
  return [...apps].sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }))
}

/** All home screen apps (grid + dock), alphabetical by label. */
export const HOME_APPS = sortAppsByLabel([
  { id: 'bank', label: 'Bank', icon: Landmark, color: 'linear-gradient(135deg, #00d4aa, #00b894)' },
  { id: 'boss', label: 'Company', icon: Building, color: 'linear-gradient(135deg, #2c3e50, #4a6741)' },
  { id: 'calculator', label: 'Calculator', icon: Calculator, color: 'linear-gradient(135deg, #636366, #48484a)' },
  { id: 'calendar', label: 'Calendar', icon: Calendar, color: 'linear-gradient(135deg, #ff6b6b, #ee5a24)' },
  { id: 'camera', label: 'Camera', icon: Camera, color: 'linear-gradient(135deg, #8e8e93, #636366)' },
  { id: 'chirp', label: SOCIAL_APP_NAME, icon: Bird, color: 'linear-gradient(135deg, #1da1f2, #0d8bd9)' },
  { id: 'documents', label: 'Documents', icon: Files, color: 'linear-gradient(135deg, #1e3a5f, #7ee8ca)' },
  { id: 'darkweb', label: 'Onion', icon: Skull, color: 'linear-gradient(135deg, #1a1a2e, #4a0e4e)' },
  { id: 'dispatch', label: 'Emergency', icon: Bell, color: 'linear-gradient(135deg, #0a101d, #1a2744)' },
  { id: 'gallery', label: 'Gallery', icon: Image, color: 'linear-gradient(135deg, #ff2d55, #ff375f)' },
  { id: 'garage', label: 'Garage', icon: Car, color: 'linear-gradient(135deg, #ff9500, #ff8c00)' },
  { id: 'invoices', label: 'Invoices', icon: FileText, color: 'linear-gradient(135deg, #ac8e68, #8e7f6e)' },
  { id: 'jobs', label: 'Jobs', icon: Briefcase, color: 'linear-gradient(135deg, #5856d6, #7d7aff)' },
  { id: 'loans', label: 'Loans', icon: HandCoins, color: 'linear-gradient(135deg, #1a7f4b, #34c759)' },
  { id: 'mail', label: 'Mail', icon: Mail, color: 'linear-gradient(135deg, #7ee8ca, #7ee8ca)' },
  { id: 'maps', label: 'Maps', icon: Map, color: 'linear-gradient(135deg, #7ee8ca, #7ee8ca)' },
  {
    id: 'market',
    label: 'LifeInvader',
    icon: LifeInvaderAppIcon,
    color: 'linear-gradient(135deg, #ff453a, #c41230)',
  },
  { id: 'messages', label: 'Messages', icon: MessageCircle, color: 'linear-gradient(135deg, #34c759, #30d158)' },
  { id: 'music', label: 'Radio', icon: Radio, color: 'linear-gradient(135deg, #e91e63, #9c27b0)' },
  { id: 'news', label: 'News', icon: Newspaper, color: 'linear-gradient(135deg, #e53935, #b71c1c)' },
  { id: 'notes', label: 'Notes', icon: StickyNote, color: 'linear-gradient(135deg, #ffd60a, #ff9f0a)' },
  { id: 'phone', label: 'Phone', icon: Phone, color: 'linear-gradient(135deg, #7ee8ca, #5cd9b8)' },
  { id: 'properties', label: 'Properties', icon: Building2, color: 'linear-gradient(135deg, #5856d6, #7d7aff)' },
  { id: 'services', label: 'Services', icon: Wrench, color: 'linear-gradient(135deg, #ff9f0a, #ff6b00)' },
  { id: 'settings', label: 'Settings', icon: Settings, color: 'linear-gradient(135deg, #5e5ce6, #7d7aff)' },
  { id: 'appstore', label: 'App Store', icon: Store, color: 'linear-gradient(135deg, #007aff, #5856d6)' },
  { id: 'trading', label: 'Trade', icon: TrendingUp, color: 'linear-gradient(135deg, #F7931A, #5856d6)' },
  { id: 'weather', label: 'Weather', icon: CloudSun, color: 'linear-gradient(135deg, #7ee8ca, #6366f1)' },
])

/** Dock apps left to right: Phone, Messages, Camera, Settings */
export const DOCK_APP_IDS = ['phone', 'messages', 'camera', 'settings']

export function getDockApps(visibleApps) {
  return DOCK_APP_IDS.map((id) => visibleApps.find((app) => app.id === id)).filter(Boolean)
}

export function getGridApps(visibleApps) {
  const dockIdSet = new Set(DOCK_APP_IDS)
  return sortAppsByLabel(visibleApps.filter((app) => !dockIdSet.has(app.id)))
}
