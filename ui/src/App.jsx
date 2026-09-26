import { PhoneProvider } from './context/PhoneContext'
import PhoneFrame from './components/PhoneFrame'
import DevToolbar from './dev/DevToolbar'

import { isNuiGameEnv } from './hooks/useNui'

const isDev = !isNuiGameEnv()

export default function App() {
  return (
    <PhoneProvider>
      {isDev && <DevToolbar />}
      <PhoneFrame />
    </PhoneProvider>
  )
}
