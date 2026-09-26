import LifeInvaderAppIcon from '../apps/lifeinvader/LifeInvaderAppIcon'
import { SOCIAL_APP_NAME } from '../../config/socialAppBranding'
import {
  Bell,
  BellOff,
  Image,
  Shield,
  Volume2,
  Landmark,
  Camera,
  Contact,
  MessageCircle,
  Bird,
  Car,
  Mail,
  Briefcase,
  Map,
  Wrench,
  StickyNote,
  FileText,
  Calculator,
  Newspaper,
  Files,
  Phone,
  User,
  Plane,
  Eye,
  EyeOff,
  SlidersHorizontal,
} from 'lucide-react'

export const SCREENS = {
  home: 'home',
  sim: 'sim',
  editCard: 'editCard',
  general: 'general',
  notifications: 'notifications',
  sounds: 'sounds',
  ringtones: 'ringtones',
  messageTones: 'messageTones',
  wallpaper: 'wallpaper',
  privacy: 'privacy',
}

export const SCREEN_TITLES = {
  [SCREENS.home]: 'Settings',
  [SCREENS.sim]: 'My Details',
  [SCREENS.editCard]: 'Edit Details',
  [SCREENS.general]: 'General',
  [SCREENS.notifications]: 'Notifications',
  [SCREENS.sounds]: 'Sounds',
  [SCREENS.ringtones]: 'Ringtones',
  [SCREENS.messageTones]: 'Message Tones',
  [SCREENS.wallpaper]: 'Wallpaper & Zoom',
  [SCREENS.privacy]: 'Privacy',
}

function sortByLabel(items) {
  return [...items].sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }))
}

export const MAIN_MENU = [
  { id: SCREENS.sim, label: 'My Details', icon: User },
  { id: SCREENS.general, label: 'General', icon: SlidersHorizontal },
  ...sortByLabel([
    { id: SCREENS.notifications, label: 'Notifications', icon: Bell },
    { id: SCREENS.sounds, label: 'Sounds', icon: Volume2 },
    { id: SCREENS.wallpaper, label: 'Wallpaper & Zoom', icon: Image },
    { id: SCREENS.privacy, label: 'Privacy', icon: Shield },
  ]),
]

export const RINGTONES = sortByLabel([
  { id: 'bell', label: 'Bell' },
  { id: 'electronic', label: 'Electronic' },
  { id: 'marimba', label: 'Marimba' },
  { id: 'old_phone', label: 'Old Phone' },
  { id: 'phone_ringing', label: 'Phone Ringing' },
  { id: 'opening', label: 'Opening' },
  { id: 'pinball', label: 'Pinball' },
  { id: 'radar', label: 'Radar' },
  { id: 'reflection', label: 'Reflection' },
  { id: 'ring_ring', label: 'Ring Ring' },
  { id: 'tritone', label: 'Tri-tone' },
  { id: 'xylophone', label: 'Xylophone' },
])

export const MESSAGE_TONES = sortByLabel([
  { id: 'ding', label: 'Ding' },
  { id: 'note', label: 'Note' },
  { id: 'pop', label: 'Pop' },
  { id: 'chime', label: 'Chime' },
  { id: 'digital', label: 'Digital' },
])

export const NOTIFICATION_APPS = sortByLabel([
  { id: 'bank', label: 'Bank', icon: Landmark, color: 'linear-gradient(135deg, #00d4aa, #00b894)' },
  { id: 'calculator', label: 'Calculator', icon: Calculator, color: 'linear-gradient(135deg, #636366, #48484a)' },
  { id: 'camera', label: 'Camera', icon: Camera, color: 'linear-gradient(135deg, #8e8e93, #636366)' },
  { id: 'chirp', label: SOCIAL_APP_NAME, icon: Bird, color: 'linear-gradient(135deg, #1da1f2, #0d8bd9)' },
  { id: 'contacts', label: 'Contacts', icon: Contact, color: 'linear-gradient(135deg, #34c759, #30d158)' },
  { id: 'documents', label: 'Documents', icon: Files, color: 'linear-gradient(135deg, #1e3a5f, #7ee8ca)' },
  { id: 'dispatch', label: 'Emergency', icon: Bell, color: 'linear-gradient(135deg, #0a101d, #1a2744)' },
  { id: 'garage', label: 'Garage', icon: Car, color: 'linear-gradient(135deg, #ff9500, #ff8c00)' },
  { id: 'mail', label: 'Mail', icon: Mail, color: 'linear-gradient(135deg, #7ee8ca, #7ee8ca)' },
  { id: 'maps', label: 'Maps', icon: Map, color: 'linear-gradient(135deg, #7ee8ca, #7ee8ca)' },
  {
    id: 'market',
    label: 'LifeInvader',
    icon: LifeInvaderAppIcon,
    color: 'linear-gradient(135deg, #ff453a, #c41230)',
  },
  { id: 'messages', label: 'Messages', icon: MessageCircle, color: 'linear-gradient(135deg, #34c759, #30d158)' },
  { id: 'news', label: 'News', icon: Newspaper, color: 'linear-gradient(135deg, #e53935, #b71c1c)' },
  { id: 'notes', label: 'Notes', icon: StickyNote, color: 'linear-gradient(135deg, #ffd60a, #ff9f0a)' },
  { id: 'phone', label: 'Phone', icon: Phone, color: 'linear-gradient(135deg, #7ee8ca, #5cd9b8)' },
  { id: 'services', label: 'Services', icon: Wrench, color: 'linear-gradient(135deg, #ff9f0a, #ff6b00)' },
])

export const DEFAULT_LOCAL_SETTINGS = {
  silentMode: false,
  callVolume: 45,
  callRingtoneVolume: 30,
  messageVolume: 30,
  callRingtone: 'opening',
  messageTone: 'ding',
  phonePrivacy: true,
  messagesPrivacy: true,
  allowNotifications: true,
  notificationSilent: false,
  airplaneMode: false,
  brightness: 100,
  streamerMode: false,
  callAnonymous: false,
  appNotifications: Object.fromEntries(NOTIFICATION_APPS.map((a) => [a.id, true])),
}

export function getLocalSettingsKey(citizenid) {
  return `sr-phone-settings-${citizenid || 'default'}`
}

export function getNotificationTrayKey(citizenid) {
  return `sr-phone-notification-tray-${citizenid || 'default'}`
}

export function getSimProfileKey(citizenid) {
  return `sr-phone-sim-profile-${citizenid || 'default'}`
}

export function getSimEditResumeKey(citizenid) {
  return `sr-phone-sim-edit-resume-${citizenid || 'default'}`
}

export const DEFAULT_SIM_PROFILE = {
  displayName: '',
  avatarUrl: '',
  notes: '',
  peopleNearbySharing: false,
}
