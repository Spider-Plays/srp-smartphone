import {
  Bell,
  Briefcase,
  Car,
  FileText,
  Landmark,
  Mail,
  MapPin,
  MessageCircle,
  Newspaper,
  Phone,
  PhoneMissed,
  Settings,
  TrendingUp,
  Wallet,
} from 'lucide-react'

const ICONS = {
  message: MessageCircle,
  messages: MessageCircle,
  call: Phone,
  missedCall: PhoneMissed,
  phone: Phone,
  garage: Car,
  bank: Landmark,
  dispatch: Bell,
  mail: Mail,
  jobs: Briefcase,
  maps: MapPin,
  market: Wallet,
  trading: TrendingUp,
  documents: FileText,
  news: Newspaper,
  settings: Settings,
  default: Bell,
}

/** Prefer notification type (e.g. missedCall) over app id for icon selection. */
export function getNotificationIcon(notification) {
  const key = notification?.type || notification?.app
  return ICONS[key] || ICONS.default
}
