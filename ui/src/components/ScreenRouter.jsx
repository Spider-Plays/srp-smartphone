import { AnimatePresence } from 'framer-motion'
import { usePhone } from '../context/PhoneContext'
import ScreenTransition from './ScreenTransition'
import LockScreen from '../screens/LockScreen'
import HomeScreen from '../screens/HomeScreen'
import MessagesScreen from '../screens/MessagesScreen'
import ChatScreen from '../screens/ChatScreen'
import PhoneApp from '../screens/PhoneApp'
import ContactsScreen from '../screens/ContactsScreen'
import EditContactScreen from '../screens/EditContactScreen'
import BankScreen from '../screens/BankScreen'
import SettingsScreen from '../screens/SettingsScreen'
import GalleryScreen from '../screens/gallery/GalleryScreen'
import GarageScreen from '../screens/GarageScreen'
import VehicleDetailScreen from '../screens/VehicleDetailScreen'
import PropertiesScreen from '../screens/PropertiesScreen'
import PropertyDetailScreen from '../screens/PropertyDetailScreen'
import CallScreen from '../screens/CallScreen'
import CameraScreen from '../screens/CameraScreen'
import ChirpApp from '../screens/chirp/ChirpApp'
import MapsScreen from '../screens/apps/MapsScreen'
import JobsScreen from '../screens/apps/JobsScreen'
import MailScreen from '../screens/apps/MailScreen'
import MarketScreen from '../screens/apps/MarketScreen'
import ServicesScreen from '../screens/apps/ServicesScreen'
import DispatchScreen from '../screens/apps/DispatchScreen'
import NotesScreen from '../screens/apps/NotesScreen'
import InvoicesScreen from '../screens/apps/InvoicesScreen'
import CalculatorScreen from '../screens/apps/CalculatorScreen'
import NewsScreen from '../screens/apps/NewsScreen'
import TradingScreen from '../screens/apps/TradingScreen'
import WeatherScreen from '../screens/apps/WeatherScreen'
import LoansScreen from '../screens/apps/LoansScreen'
import LoanApplyScreen from '../screens/apps/LoanApplyScreen'
import LoanDetailScreen from '../screens/apps/LoanDetailScreen'
import DocumentsScreen from '../screens/apps/documents/DocumentsScreen'
import BossScreen from '../screens/apps/BossScreen'
import DarkWebScreen from '../screens/apps/DarkWebScreen'
import CalendarScreen from '../screens/apps/CalendarScreen'
import RadioScreen from '../screens/apps/RadioScreen'
import AppStoreScreen from '../screens/apps/AppStoreScreen'

const SCREENS = {
  lock: LockScreen,
  home: HomeScreen,
  messages: MessagesScreen,
  chat: ChatScreen,
  phone: PhoneApp,
  contacts: ContactsScreen,
  'edit-contact': EditContactScreen,
  bank: BankScreen,
  settings: SettingsScreen,
  gallery: GalleryScreen,
  garage: GarageScreen,
  'vehicle-detail': VehicleDetailScreen,
  properties: PropertiesScreen,
  'property-detail': PropertyDetailScreen,
  call: CallScreen,
  camera: CameraScreen,
  chirp: ChirpApp,
  maps: MapsScreen,
  jobs: JobsScreen,
  mail: MailScreen,
  market: MarketScreen,
  services: ServicesScreen,
  dispatch: DispatchScreen,
  notes: NotesScreen,
  invoices: InvoicesScreen,
  calculator: CalculatorScreen,
  documents: DocumentsScreen,
  news: NewsScreen,
  trading: TradingScreen,
  weather: WeatherScreen,
  loans: LoansScreen,
  'loan-apply': LoanApplyScreen,
  'loan-detail': LoanDetailScreen,
  boss: BossScreen,
  darkweb: DarkWebScreen,
  calendar: CalendarScreen,
  music: RadioScreen,
  appstore: AppStoreScreen,
}

export default function ScreenRouter({ screen: forcedScreen } = {}) {
  const { screen: routeScreen } = usePhone()
  const screen = forcedScreen || routeScreen
  const Component = SCREENS[screen] || HomeScreen

  return (
    <AnimatePresence mode="wait">
      {screen === 'home' ? (
        <div
          key="home"
          className="screen-layer screen-layer--home"
          style={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column', width: '100%' }}
        >
          <HomeScreen />
        </div>
      ) : (
        <ScreenTransition key={screen}>
          <Component />
        </ScreenTransition>
      )}
    </AnimatePresence>
  )
}
