import { useCallback, useEffect, useRef } from 'react'

const resourceName =
  typeof window.GetParentResourceName === 'function'
    ? window.GetParentResourceName()
    : 'sr-smartphone'

let devMockLoader = null

function loadDevMocks() {
  if (!devMockLoader) {
    devMockLoader = import('../dev/devNuiMocks.js')
  }
  return devMockLoader
}

export function isNuiGameEnv() {
  return (
    typeof window.GetParentResourceName === 'function' &&
    typeof window.invokeNative === 'function'
  )
}

export async function fetchNui(event, data = {}) {
  if (!isNuiGameEnv()) {
    if (!import.meta.env.DEV) return null
    const mod = await loadDevMocks()
    return mod.devMockResponse(event, data)
  }

  const res = await fetch(`https://${resourceName}/${event}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })

  try {
    return await res.json()
  } catch {
    return null
  }
}

export function setDevServicesWorkerMode(enabled) {
  if (!import.meta.env.DEV) return
  loadDevMocks().then((mod) => mod.setDevServicesWorkerMode(enabled))
}

export function useNuiEvent(handler) {
  useEffect(() => {
    const listener = (e) => {
      if (e.data?.action) handler(e.data)
    }
    window.addEventListener('message', listener)
    return () => window.removeEventListener('message', listener)
  }, [handler])
}

const NON_TYPING_INPUT_TYPES = new Set([
  'button',
  'checkbox',
  'color',
  'file',
  'hidden',
  'radio',
  'range',
  'reset',
  'submit',
])

function isPhoneTextInput(el) {
  if (!el || !(el instanceof HTMLElement)) return false
  const tag = el.tagName
  if (tag === 'TEXTAREA') return true
  if (tag === 'SELECT') return true
  if (el.isContentEditable) return true
  if (tag !== 'INPUT') return false
  const type = (el.type || 'text').toLowerCase()
  return !NON_TYPING_INPUT_TYPES.has(type)
}

/** Tell the client to block game controls while a phone text field is focused. */
export function usePhoneTypingLock(enabled) {
  const typingRef = useRef(false)

  useEffect(() => {
    if (!enabled) {
      if (typingRef.current) {
        typingRef.current = false
        fetchNui('setPhoneTyping', { typing: false })
      }
      return undefined
    }

    const setTyping = (typing) => {
      if (typingRef.current === typing) return
      typingRef.current = typing
      fetchNui('setPhoneTyping', { typing })
    }

    const onFocusIn = (e) => {
      if (isPhoneTextInput(e.target)) setTyping(true)
    }

    const onFocusOut = () => {
      requestAnimationFrame(() => {
        if (isPhoneTextInput(document.activeElement)) return
        setTyping(false)
      })
    }

    document.addEventListener('focusin', onFocusIn, true)
    document.addEventListener('focusout', onFocusOut, true)

    return () => {
      document.removeEventListener('focusin', onFocusIn, true)
      document.removeEventListener('focusout', onFocusOut, true)
      setTyping(false)
    }
  }, [enabled])
}

export function useEscapeClose(visible, onClose) {
  useEffect(() => {
    if (!visible) return
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        onClose()
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [visible, onClose])
}

export function closePhone() {
  return fetchNui('close')
}

export function useNuiCallback() {
  return useCallback((event, data) => fetchNui(event, data), [])
}
