/**
 * Browser-only NUI mocks for `npm run dev`. Not bundled into the FiveM production build.
 */
import { PREMADE_DOC_TEMPLATES, mapPremadeForUi } from '../screens/apps/documents/premadeTemplates'
import { buildDevWeatherData } from './devWeather'
import {
  buildDevLoansDashboard,
  buildDevLoanDetail,
  devPreviewLoan,
  devApplyLoan,
  devPayLoan,
  devSetLoanAutopay,
} from './devLoans'

const empty = {
  list: () => [],
  ok: () => ({ ok: true }),
  pages: () => ({ items: [], total: 0 }),
}

const DEV_MOCKS = {
  getContacts: () => [
    { id: 1, name: 'Jane Doe', phone: '555-0101', note: 'Work colleague' },
    { id: 2, name: 'Mike Smith', phone: '555-0202', note: '' },
  ],
  getConversations: () => [
    { phone: '555-0101', name: 'Jane Doe', last_message: 'See you soon!', unread: 1, updated_at: new Date().toISOString() },
  ],
  getMessages: () => ({
    messages: [
      { id: 1, body: 'Hey!', outgoing: 0, created_at: new Date().toISOString() },
      { id: 2, body: 'Hi there', outgoing: 1, created_at: new Date().toISOString() },
    ],
  }),
  sendMessage: empty.ok,
  getCallHistory: empty.list,
  startCall: () => ({ ok: true, callId: `dev-${Date.now()}`, name: 'Jane Doe', phone: '555-0101' }),
  answerCall: empty.ok,
  declineCall: empty.ok,
  endCall: empty.ok,
  lookupPhone: () => ({ ok: true, name: 'Jane Doe', phone: '555-0101' }),
  saveSettings: empty.ok,
  setPhoneTyping: empty.ok,
  bankTransfer: () => ({ ok: true, bank: 14500, cash: 2500 }),
  bankTransferById: () => ({ ok: true, bank: 14500, cash: 2500 }),
  getBankHistory: () => ({ history: [] }),
  getGallery: () => ({ photos: [] }),
  deleteGalleryPhotos: empty.ok,
  renameGalleryPhoto: empty.ok,
  importGalleryPhoto: empty.ok,
  shareGalleryPhoto: empty.ok,
  getVehicles: () => ({ vehicles: [] }),
  getProperties: () => ({ apartments: [], houses: [], listings: [] }),
  getMapsData: () => ({ defaultPins: [], saved: [] }),
  saveMapPin: empty.ok,
  deleteMapPin: empty.ok,
  shareMapLocation: empty.ok,
  getJobsData: () => ({
    job: { name: 'unemployed', label: 'Unemployed', onDuty: false, payment: 0 },
    notifications: [],
  }),
  toggleJobDuty: () => ({ ok: true, onDuty: true }),
  getMailAccount: () => ({ address: '5551234@spider.mail' }),
  getMail: () => ({ inbox: [], sent: [], trash: [] }),
  sendMail: empty.ok,
  getMarketListings: () => ({ listings: [] }),
  getJobCenterData: () => ({ enabled: true, jobs: [], applications: [] }),
  getServicesData: () => ({ types: [], myRequests: [], isWorker: false, workerJobs: [] }),
  getDispatchConfig: () => ({ categories: [] }),
  getEmergencyData: () => ({ lawyers: [], judges: [], proceedings: [], legislation: [] }),
  sendDispatch: empty.ok,
  getNotes: empty.list,
  saveNote: () => ({ ok: true, id: Date.now() }),
  getInvoices: () => ({ received: [], sent: [] }),
  getNewsArticles: () => ({ articles: [] }),
  getNewsOutlets: () => [],
  getDocTemplates: () => ({ premade: mapPremadeForUi(PREMADE_DOC_TEMPLATES), custom: [] }),
  getDocuments: () => ({ inbox: [], sent: [], drafts: [] }),
  getTradingData: () => ({ crypto: { assets: [] }, stocks: { assets: [] }, watchlist: [], alerts: [] }),
  getCryptoData: () => ({ holdings: [], assets: [] }),
  getStockData: () => ({ holdings: [], assets: [] }),
  getLoansData: () => buildDevLoansDashboard(),
  previewLoan: (data) => devPreviewLoan(data),
  applyLoan: (data) => devApplyLoan(data),
  payLoan: (data) => devPayLoan(data),
  setLoanAutopay: (data) => devSetLoanAutopay(data),
  getLoanDetail: (data) => buildDevLoanDetail(data?.loanId),
  getWalletCards: () => ({ cards: [] }),
  getBossData: () => ({ isBoss: false }),
  getMdtData: () => ({ allowed: false }),
  getEmsData: () => ({ allowed: false }),
  getDarkWebListings: () => ({ listings: [], mine: [] }),
  getCalendarEvents: () => ({ events: [], serverEvents: [] }),
  getRadioStations: () => ({ stations: [], current: null }),
  getAppStoreCatalog: () => ({ catalog: [], installed: {} }),
  getNearbyPlayers: empty.list,
  chirpGetAccount: () => ({ loggedIn: false }),
  chirpGetFeed: () => ({ posts: [] }),
  chirpGetConfig: () => ({ verificationPrice: 25000 }),
  close: () => 'ok',
  hideFrame: () => 'ok',
}

let devServicesWorkerMode = false

export function setDevServicesWorkerMode(enabled) {
  devServicesWorkerMode = !!enabled
}

export async function devMockResponse(event, data) {
  if (event === 'getWeatherData') return buildDevWeatherData()
  if (event === 'getServicesData' && devServicesWorkerMode) {
    return {
      types: [{ id: 'taxi', label: 'Taxi' }],
      myRequests: [],
      isWorker: true,
      workerJobs: [],
      workerProfile: { serviceType: 'taxi', xp: 120, reputation: 20, onDuty: true },
    }
  }
  if (event === 'saveSettings') return { ok: true }
  if (event === 'setFlashlight') return { ok: true, enabled: data?.enabled === true }

  const mock = DEV_MOCKS[event]
  if (typeof mock === 'function') return mock(data)

  return null
}
