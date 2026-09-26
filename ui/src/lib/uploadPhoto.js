/**
 * lb-phone style: NUI uploads to Fivemanage via presigned URL (fetch from CEF).
 * Server only issues the presigned URL — API key never sent to other clients in bulk.
 */

export async function dataURLToBlob(dataURL) {
  const res = await fetch(dataURL)
  if (!res.ok) throw new Error('Could not read image data')
  return res.blob()
}

/**
 * @param {string} presignedUrl
 * @param {Blob} blob
 * @param {string} field - "image" (v2) or "file" (v3)
 * @returns {Promise<string>} public CDN URL
 */
export async function uploadToFivemanage(presignedUrl, blob, field = 'image', filename = 'photo.webp') {
  const form = new FormData()
  form.append(field, blob, filename)

  const res = await fetch(presignedUrl, { method: 'POST', body: form })
  const text = await res.text()

  let json
  try {
    json = JSON.parse(text)
  } catch {
    throw new Error(`Fivemanage upload invalid response (${res.status})`)
  }

  if (!res.ok) {
    const msg = json?.message || json?.error || text.slice(0, 120)
    throw new Error(`Fivemanage upload failed (${res.status}): ${msg}`)
  }

  const url =
    json?.data?.url
    || json?.data?.originalUrl
    || json?.url
    || json?.originalUrl
  if (typeof url !== 'string' || !url.startsWith('http')) {
    throw new Error('Fivemanage upload returned no URL')
  }

  return url.trim()
}
