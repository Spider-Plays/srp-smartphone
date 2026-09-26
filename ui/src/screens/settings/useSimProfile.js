import { useCallback, useEffect, useState } from 'react'
import { usePhone } from '../../context/PhoneContext'
import { DEFAULT_SIM_PROFILE, getSimProfileKey } from './constants'

function loadProfile(citizenid) {
  try {
    const raw = localStorage.getItem(getSimProfileKey(citizenid))
    if (!raw) return { ...DEFAULT_SIM_PROFILE }
    return { ...DEFAULT_SIM_PROFILE, ...JSON.parse(raw) }
  } catch {
    return { ...DEFAULT_SIM_PROFILE }
  }
}

function saveProfile(citizenid, profile) {
  try {
    localStorage.setItem(getSimProfileKey(citizenid), JSON.stringify(profile))
  } catch {
    /* ignore */
  }
}

export function useSimProfile() {
  const { bootstrap } = usePhone()
  const citizenid = bootstrap?.citizenid
  const [profile, setProfile] = useState(() => loadProfile(citizenid))

  useEffect(() => {
    setProfile(loadProfile(citizenid))
  }, [citizenid])

  const save = useCallback(
    (patch) => {
      setProfile((prev) => {
        const next = { ...prev, ...patch }
        saveProfile(citizenid, next)
        return next
      })
    },
    [citizenid]
  )

  const cardName = profile.displayName?.trim() || bootstrap?.name || 'Unknown'
  const phone = bootstrap?.phone || '—'
  const citizenId = bootstrap?.citizenid ?? '—'
  const apartment = bootstrap?.apartment || '—'

  return {
    profile,
    save,
    cardName,
    phone,
    citizenId,
    apartment,
    legalName: bootstrap?.name || 'Unknown',
  }
}
