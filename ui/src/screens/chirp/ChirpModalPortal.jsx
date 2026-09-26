import { createPortal } from 'react-dom'
import { useEffect, useState } from 'react'

function getPhoneScreen() {
  return document.querySelector('.phone-screen')
}

/** Renders modals on the phone screen so they stay fixed while app content scrolls. */
export default function ChirpModalPortal({ children }) {
  const [host, setHost] = useState(null)

  useEffect(() => {
    setHost(getPhoneScreen())
  }, [])

  if (!host) return children
  return createPortal(children, host)
}
