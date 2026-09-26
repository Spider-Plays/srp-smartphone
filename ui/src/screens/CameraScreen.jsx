import { useEffect, useRef, useState } from 'react'
import { ChevronDown, FlipHorizontal, Image as ImageIcon, RotateCcw, Square } from 'lucide-react'
import { usePhone } from '../context/PhoneContext'
import { fetchNui } from '../hooks/useNui'
import { GameRender } from '../lib/GameRender'
import { dataURLToBlob, uploadToFivemanage } from '../lib/uploadPhoto'
import './camera/camera.css'

/** Shrink a data URL before sending it through NUI → Lua (large payloads get truncated). */
function compressDataURL(dataURL, maxDim = 1280, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const img = document.createElement('img')
    img.onload = () => {
      let { width, height } = img
      const scale = Math.min(1, maxDim / Math.max(width, height))
      width = Math.max(1, Math.round(width * scale))
      height = Math.max(1, Math.round(height * scale))
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      canvas.getContext('2d').drawImage(img, 0, 0, width, height)
      resolve(canvas.toDataURL('image/webp', quality))
    }
    img.onerror = () => reject(new Error('Could not decode preview image'))
    img.src = dataURL
  })
}

function formatRecordTime(seconds) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

const DEFAULT_ZOOM_LEVELS = [
  { id: 'ultrawide', label: '0.5', scale: 0.5 },
  { id: 'wide', label: '1', scale: 1 },
  { id: 'telephoto', label: '2', scale: 2 },
]

function scaleForZoomLevel(levels, levelId) {
  const level = levels.find((z) => z.id === levelId)
  const scale = Number(level?.scale)
  return scale > 0 ? scale : 1
}

function formatZoomLabel(label) {
  const raw = String(label ?? '').trim()
  if (!raw) return '1'
  return raw.includes('×') ? raw : `${raw}×`
}

export default function CameraScreen() {
  const { goBack, notify, navigate, refreshGallery } = usePhone()
  const [mode, setMode] = useState('photo')
  const [capturing, setCapturing] = useState(false)
  const [recording, setRecording] = useState(false)
  const [recordSeconds, setRecordSeconds] = useState(0)
  const [flash, setFlash] = useState(false)
  const [preview, setPreview] = useState(null)
  const [saving, setSaving] = useState(false)
  const [isSelfie, setIsSelfie] = useState(false)
  const [luaReady, setLuaReady] = useState(false)
  const [videoEnabled, setVideoEnabled] = useState(true)
  const [maxVideoDuration, setMaxVideoDuration] = useState(15)
  const [maxVideoSizeMb, setMaxVideoSizeMb] = useState(24)
  const [zoomLevels, setZoomLevels] = useState(DEFAULT_ZOOM_LEVELS)
  const [zoom, setZoom] = useState('wide')

  const canvasRef = useRef(null)
  const renderRef = useRef(null)
  const recorderRef = useRef(null)
  const recordTimerRef = useRef(null)
  const previewUrlRef = useRef(null)

  const revokePreviewUrl = () => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current)
      previewUrlRef.current = null
    }
  }

  useEffect(() => {
    fetchNui('cameraOpen').then((res) => {
      if (res?.isSelfie != null) setIsSelfie(res.isSelfie)
      if (res?.videoEnabled === false) setVideoEnabled(false)
      if (res?.maxVideoDuration) setMaxVideoDuration(res.maxVideoDuration)
      if (res?.maxVideoSizeMb) setMaxVideoSizeMb(res.maxVideoSizeMb)
      if (Array.isArray(res?.zoomLevels) && res.zoomLevels.length > 0) {
        setZoomLevels(res.zoomLevels)
      }
      if (res?.zoom) setZoom(res.zoom)
      setLuaReady(true)
    })
    return () => {
      if (recorderRef.current) {
        try {
          recorderRef.current.stop()
        } catch {
          /* ignore */
        }
        recorderRef.current = null
      }
      if (recordTimerRef.current) {
        clearInterval(recordTimerRef.current)
        recordTimerRef.current = null
      }
      revokePreviewUrl()
      fetchNui('cameraClose')
    }
  }, [])

  useEffect(() => {
    if (!luaReady) return
    const canvas = canvasRef.current
    if (!canvas) return
    try {
      const render = new GameRender(canvas)
      renderRef.current = render
      render.resizeByAspect(3 / 4)
      const w = window.innerWidth
      if (w > 1920) render.setQuality(1920 / w)
    } catch (e) {
      console.warn('[sr-smartphone] GameRender init failed:', e.message)
    }
    return () => {
      renderRef.current?.destroy()
      renderRef.current = null
    }
  }, [luaReady])

  useEffect(() => {
    if (!luaReady || !renderRef.current) return
    renderRef.current.setZoom(scaleForZoomLevel(zoomLevels, zoom))
  }, [luaReady, zoom, zoomLevels])

  useEffect(() => {
    if (!recording) {
      if (recordTimerRef.current) {
        clearInterval(recordTimerRef.current)
        recordTimerRef.current = null
      }
      return undefined
    }

    recordTimerRef.current = window.setInterval(() => {
      setRecordSeconds((s) => {
        const next = s + 1
        if (next >= maxVideoDuration && recorderRef.current) {
          try {
            recorderRef.current.stop()
          } catch {
            /* ignore */
          }
          recorderRef.current = null
          setRecording(false)
        }
        return next
      })
    }, 1000)

    return () => {
      if (recordTimerRef.current) {
        clearInterval(recordTimerRef.current)
        recordTimerRef.current = null
      }
    }
  }, [recording, maxVideoDuration])

  const triggerFlash = () => {
    setFlash(true)
    window.setTimeout(() => setFlash(false), 280)
  }

  const takePhoto = async () => {
    if (capturing || recording) return
    const render = renderRef.current
    if (!render) {
      notify('Camera Error', 'Camera is not ready yet.', 'default')
      return
    }
    setCapturing(true)
    try {
      await fetchNui('cameraShutter')
      const dataURL = render.takePhotoDataURL('image/webp', 0.9)
      if (!dataURL || !dataURL.startsWith('data:image/')) {
        throw new Error('Canvas returned no image data')
      }
      triggerFlash()
      revokePreviewUrl()
      setPreview({ type: 'photo', url: dataURL })
    } catch (err) {
      console.warn('[sr-smartphone] takePhoto failed:', err?.message || err)
      notify('Camera Error', 'Could not capture photo.', 'default')
    } finally {
      setCapturing(false)
    }
  }

  const stopRecording = () => {
    if (!recorderRef.current) return
    try {
      recorderRef.current.stop()
    } catch {
      /* ignore */
    }
    recorderRef.current = null
    setRecording(false)
  }

  const startRecording = () => {
    if (recording || capturing || !luaReady) return
    const render = renderRef.current
    if (!render?.startRecording) {
      notify('Camera Error', 'Video recording is not supported here.', 'default')
      return
    }

    setRecordSeconds(0)
    const handle = render.startRecording((blob) => {
      setRecording(false)
      recorderRef.current = null
      if (!blob || blob.size < 1) {
        notify('Camera Error', 'Recording was empty.', 'default')
        return
      }
      const maxBytes = maxVideoSizeMb * 1024 * 1024
      if (blob.size > maxBytes) {
        notify('Video Too Large', `Keep clips under ${maxVideoSizeMb} MB.`, 'default')
        return
      }
      revokePreviewUrl()
      const objectUrl = URL.createObjectURL(blob)
      previewUrlRef.current = objectUrl
      setPreview({ type: 'video', url: objectUrl, blob })
    })

    if (!handle) {
      notify('Camera Error', 'Could not start recording.', 'default')
      return
    }

    recorderRef.current = handle
    setRecording(true)
  }

  const toggleRecording = () => {
    if (recording) stopRecording()
    else startRecording()
  }

  const flipCamera = async () => {
    if (recording) return
    const result = await fetchNui('flipCamera')
    if (typeof result?.isSelfie === 'boolean') setIsSelfie(result.isSelfie)
    if (result?.zoom) setZoom(result.zoom)
  }

  const setZoomLevel = async (levelId) => {
    if (recording || preview || levelId === zoom) return
    if (isSelfie && levelId !== 'wide') return
    renderRef.current?.setZoom(scaleForZoomLevel(zoomLevels, levelId))
    setZoom(levelId)
    const result = await fetchNui('setCameraZoom', { zoom: levelId })
    if (result?.ok && result.zoom) {
      setZoom(result.zoom)
      if (result.scale) renderRef.current?.setZoom(result.scale)
    }
  }

  const uploadMedia = async (payload) => {
    const { type, blob, dataUrl } = payload
    const uploadInfo = await fetchNui('getCameraUploadMethod')
    const isVideo = type === 'video'

    if (isVideo && uploadInfo?.method !== 'fivemanage') {
      throw new Error('Video clips require Fivemanage (set sr_phone_fivemanage_video_key).')
    }
    if (isVideo && uploadInfo?.hasFivemanageVideo === false) {
      throw new Error('Video API key missing — set sr_phone_fivemanage_video_key in server.cfg.')
    }

    if (uploadInfo?.method === 'fivemanage') {
      if (!isVideo && uploadInfo?.hasFivemanage === false) {
        throw new Error('Image API key missing — set sr_phone_fivemanage_image_key in server.cfg.')
      }
      const presigned = await fetchNui('getPresignedUrl', { fileType: isVideo ? 'video' : 'image' })
      if (!presigned?.ok || !presigned.presignedUrl) {
        const err = presigned?.error
        if (err === 'no_api_key') {
          throw new Error(
            isVideo
              ? 'Video API key missing — set sr_phone_fivemanage_video_key in server.cfg.'
              : 'Image API key missing — set sr_phone_fivemanage_image_key in server.cfg.',
          )
        }
        throw new Error(err || 'Could not get Fivemanage upload URL')
      }
      const uploadBlob = blob || (await dataURLToBlob(dataUrl))
      const filename = isVideo ? 'clip.webm' : 'photo.webp'
      return uploadToFivemanage(
        presigned.presignedUrl,
        uploadBlob,
        presigned.field || (isVideo ? 'file' : 'image'),
        filename,
      )
    }

    if (isVideo) {
      throw new Error('Video clips require Fivemanage upload.')
    }

    return compressDataURL(dataUrl)
  }

  const saveMedia = async () => {
    if (!preview || saving) return
    setSaving(true)
    try {
      const urlToSave = await uploadMedia({
        type: preview.type,
        blob: preview.blob,
        dataUrl: preview.type === 'photo' ? preview.url : null,
      })

      const result = await fetchNui('savePhoto', {
        url: urlToSave,
        isSelfie,
        mediaType: preview.type === 'video' ? 'video' : 'photo',
      })

      if (result?.ok && result.id) {
        refreshGallery()
        notify(
          preview.type === 'video' ? 'Video Saved' : 'Photo Saved',
          'Added to your gallery',
          'default',
        )
        revokePreviewUrl()
        setPreview(null)
        navigate('gallery')
      } else {
        const msg = result?.error === 'gallery_full'
          ? 'Gallery is full'
          : result?.error === 'insert_failed'
            ? 'Database could not store the photo — run sql/migrate_gallery.sql'
            : result?.error === 'video_requires_host'
              ? 'Configure Fivemanage for video uploads'
              : result?.error === 'no_api_key'
                ? 'Fivemanage API key not configured'
                : result?.error === 'invalid_url'
                  ? 'Upload did not return a valid image URL'
                  : 'Could not save'
        notify('Save Failed', msg, 'default')
      }
    } catch (err) {
      console.warn('[sr-smartphone] saveMedia failed:', err?.message || err)
      notify('Save Failed', err?.message || 'Could not save', 'default')
    } finally {
      setSaving(false)
    }
  }

  const handleBack = () => {
    if (recording) stopRecording()
    fetchNui('cameraClose')
    goBack()
  }

  const switchMode = (next) => {
    if (recording || next === mode) return
    setMode(next)
  }

  const clearPreview = () => {
    revokePreviewUrl()
    setPreview(null)
  }

  return (
    <div className="camera-app">
      <div className="camera-viewfinder">
        <canvas ref={canvasRef} className="camera-canvas" aria-hidden="true" />
        <div className="camera-focus-frame" aria-hidden="true">
          <span className="camera-focus-corner" />
        </div>
        {flash && <div className="camera-flash" aria-hidden="true" />}
        {recording && (
          <div className="camera-recording-badge" aria-live="polite">
            <span className="camera-recording-dot" />
            REC {formatRecordTime(recordSeconds)}
          </div>
        )}
        {!luaReady && (
          <div className="camera-loading">
            <span className="camera-loading-spinner" />
            Starting camera…
          </div>
        )}
      </div>

      {!preview && (
        <>
      <div className="camera-overlay camera-overlay--top">
        <button type="button" className="camera-icon-btn" onClick={handleBack} aria-label="Close camera">
          <ChevronDown size={22} />
        </button>
        <div className="camera-mode-switch" role="tablist" aria-label="Camera mode">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'photo'}
            className={`camera-mode-btn${mode === 'photo' ? ' is-active' : ''}`}
            onClick={() => switchMode('photo')}
          >
            PHOTO
          </button>
          {videoEnabled && (
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'video'}
              className={`camera-mode-btn${mode === 'video' ? ' is-active' : ''}`}
              onClick={() => switchMode('video')}
            >
              VIDEO
            </button>
          )}
        </div>
        <span className="camera-lens-badge">{isSelfie ? 'Front' : 'Rear'}</span>
      </div>

      <div className="camera-overlay camera-overlay--bottom">
        <p className="camera-hint">
          {mode === 'video'
            ? recording
              ? 'Tap stop to finish · Max ' + maxVideoDuration + 's'
              : 'Tap record to capture video'
            : 'Left Alt: cursor · Mouse: aim'}
        </p>
        {zoomLevels.length > 0 && (
          <div className="camera-zoom-picker" role="group" aria-label="Camera zoom">
            {zoomLevels.map((level) => {
              const disabled = recording || isSelfie && level.id !== 'wide'
              const active = zoom === level.id
              return (
                <button
                  key={level.id}
                  type="button"
                  className={`camera-zoom-btn${active ? ' is-active' : ''}`}
                  onClick={() => setZoomLevel(level.id)}
                  disabled={disabled}
                  aria-pressed={active}
                  aria-label={`${formatZoomLabel(level.label)} zoom`}
                >
                  {formatZoomLabel(level.label)}
                </button>
              )
            })}
          </div>
        )}
        <div className="camera-controls-row">
          <button
            type="button"
            className="camera-tool-btn"
            onClick={flipCamera}
            disabled={recording}
            title="Flip camera"
            aria-label="Flip camera"
          >
            <FlipHorizontal size={22} />
          </button>
          <div className="camera-shutter-wrap">
            {mode === 'photo' ? (
              <button
                type="button"
                className={`camera-shutter${capturing ? ' is-capturing' : ''}`}
                onClick={takePhoto}
                disabled={capturing || !luaReady}
                aria-label="Take photo"
              >
                <span className="camera-shutter-inner" />
              </button>
            ) : (
              <button
                type="button"
                className={`camera-shutter camera-shutter--video${recording ? ' is-recording' : ''}`}
                onClick={toggleRecording}
                disabled={!luaReady}
                aria-label={recording ? 'Stop recording' : 'Start recording'}
              >
                <span className="camera-shutter-inner">
                  {recording ? <Square size={22} fill="currentColor" /> : null}
                </span>
              </button>
            )}
          </div>
          <button
            type="button"
            className="camera-gallery-btn"
            onClick={() => navigate('gallery')}
            disabled={recording}
            title="Open gallery"
            aria-label="Open gallery"
          >
            <ImageIcon size={20} />
          </button>
        </div>
      </div>
        </>
      )}

      {preview && (
        <div className="camera-review" role="dialog" aria-label="Review capture">
          {preview.type === 'video' ? (
            <video
              src={preview.url}
              className="camera-review-image camera-review-video"
              controls
              playsInline
              autoPlay
              loop
              muted
            />
          ) : (
            <img src={preview.url} alt="Captured preview" className="camera-review-image" />
          )}
          <div className="camera-review-top">
            <button
              type="button"
              className="camera-icon-btn"
              onClick={clearPreview}
              disabled={saving}
              aria-label="Back to camera"
            >
              <ChevronDown size={22} />
            </button>
          </div>
          <div className="camera-review-bottom">
            <button
              type="button"
              className="camera-review-btn camera-review-btn--retake"
              onClick={clearPreview}
              disabled={saving}
            >
              <RotateCcw size={18} />
              Retake
            </button>
            <button
              type="button"
              className="camera-review-btn camera-review-btn--save"
              onClick={saveMedia}
              disabled={saving}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
