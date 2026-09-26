/**
 * GameRender — faithful port of lb-phone's Nu class.
 *
 * FiveM's NUI hooks WebGL contexts that declare a sampler2D uniform named
 * `external_texture` and, once `CellCamActivate(true, true)` is active on the
 * Lua side, writes each game-camera frame into the texture currently bound
 * to that uniform's texture unit.
 *
 * Two things make this work in-game:
 *   1) The canvas backing store starts at full window size so FiveM hits the
 *      same render path used for lb-phone.
 *   2) The constructor calls this.resize(innerWidth, innerHeight) which sets
 *      canvas.width twice, re-initialises the prev-frame textures and runs
 *      applyQuality / applyOffset in the exact order lb-phone uses.
 *
 * Anything done out of that order yields a black canvas in-game even though
 * the WebGL pipeline looks fine in DevTools.
 */

const FRAG = `precision mediump float;

varying highp vec2 texture_coords;

uniform sampler2D external_texture;
uniform sampler2D u_prev_frame_texture[4];
uniform float u_zoom;

vec2 zoomed_uv(vec2 tc) {
    float z = max(u_zoom, 0.05);
    return (tc - 0.5) / z + 0.5;
}

void main()
{
    vec2 uv = zoomed_uv(texture_coords);
    vec4 color = texture2D(external_texture, uv);

    if (color.rgb != vec3(0.0, 0.0, 0.0)) {
        gl_FragColor = color;

        return;
    }

    for (int i = 0; i < 4; i++) {
        vec4 prev_color = texture2D(u_prev_frame_texture[i], uv);

        if (prev_color.rgb != vec3(0.0, 0.0, 0.0)) {
            gl_FragColor = prev_color;

            break;
        }
    }
}
`

const VERT = `attribute vec2 a_position;
attribute vec2 a_texcoord;

varying vec2 texture_coords;

void main() {
\tgl_Position = vec4(a_position, 0.0, 1.0);

\ttexture_coords = a_texcoord;
}`

const PREV_FRAMES = 4

function createShader(gl, type, src) {
  const shader = gl.createShader(type)
  if (!shader) throw new Error('GameRender: could not create shader')
  gl.shaderSource(shader, src)
  gl.compileShader(shader)
  return shader
}

function createProgram(gl) {
  const vs = createShader(gl, gl.VERTEX_SHADER, VERT)
  const fs = createShader(gl, gl.FRAGMENT_SHADER, FRAG)
  const program = gl.createProgram()
  if (!program) throw new Error('GameRender: could not create program')
  gl.attachShader(program, vs)
  gl.attachShader(program, fs)
  gl.linkProgram(program)
  gl.useProgram(program)
  const vloc = gl.getAttribLocation(program, 'a_position')
  const tloc = gl.getAttribLocation(program, 'a_texcoord')
  return { program, vloc, tloc }
}

function createTextures(gl, prevCount) {
  // Main texture is the FiveM-written external_texture slot. Initialised as a
  // 1×1 red pixel — the exact sentinel lb-phone uses. The WRAP_T parameter is
  // toggled CLAMP → MIRRORED_REPEAT → REPEAT → CLAMP on purpose: it's the
  // pattern FiveM looks for when deciding which WebGL texture to feed.
  const mainTexture = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_2D, mainTexture)
  gl.texImage2D(
    gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
    new Uint8Array([255, 0, 0, 255])
  )
  gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
  gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
  gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.MIRRORED_REPEAT)
  gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT)
  gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

  const prevTextures = []
  for (let i = 0; i < prevCount; i++) {
    const t = gl.createTexture()
    if (!t) continue
    gl.bindTexture(gl.TEXTURE_2D, t)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texImage2D(
      gl.TEXTURE_2D, 0, gl.RGBA,
      gl.canvas.width, gl.canvas.height,
      0, gl.RGBA, gl.UNSIGNED_BYTE,
      new Uint8Array(gl.canvas.width * gl.canvas.height * 4)
    )
    prevTextures.push(t)
  }

  return { mainTexture, prevTextures }
}

function createBuffers(gl, prevTextures) {
  const vertexBuffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer)
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
    gl.STATIC_DRAW
  )

  const texcoordBuffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer)
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]),
    gl.STATIC_DRAW
  )

  const prevBuffers = []
  for (const tex of prevTextures) {
    const fb = gl.createFramebuffer()
    if (!fb) continue
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb)
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D, tex, 0
    )
    prevBuffers.push(fb)
  }
  gl.bindFramebuffer(gl.FRAMEBUFFER, null)

  return { vertexBuffer, texcoordBuffer, prevBuffers }
}

export class GameRender {
  constructor(canvas) {
    if (!canvas) throw new Error('GameRender: no canvas')

    this.quality = 1
    this.zoom = 1
    this.xOffset = 0
    this.yOffset = 0
    this.destroyed = false
    this.paused = false
    this.canvas = canvas
    this.gl = null
    this.program = null
    this.viewport = { x: 0, y: 0, width: 0, height: 0 }
    this.canvasSize = { width: 0, height: 0 }
    this.animationFrame = null
    this.mainTexture = null
    this.prevTextures = []
    this.prevBuffers = []
    this.recording = false
    this.recorder = null
    this.recordStream = null

    this.render = () => {
      const {
        gl, program, mainTexture, prevTextures, prevBuffers, viewport, paused,
      } = this
      if (!gl || !program || !mainTexture || !prevTextures || paused) return

      gl.viewport(viewport.x, 0, viewport.width, viewport.height)
      gl.bindFramebuffer(gl.FRAMEBUFFER, null)
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, mainTexture)
      for (let i = 0; i < prevTextures.length; i++) {
        gl.activeTexture(gl.TEXTURE1 + i)
        gl.bindTexture(gl.TEXTURE_2D, prevTextures[i])
      }
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)

      gl.viewport(0, 0, window.innerWidth, window.innerHeight)
      for (let i = prevTextures.length - 1; i >= 0; i--) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, prevBuffers[i])
        gl.activeTexture(gl.TEXTURE1 + i)
        gl.bindTexture(gl.TEXTURE_2D, null)
        gl.activeTexture(gl.TEXTURE0)
        gl.bindTexture(gl.TEXTURE_2D, mainTexture)
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
      }

      gl.finish()
      this.animationFrame = requestAnimationFrame(this.render)
    }

    const gl = canvas.getContext('webgl', {
      antialias: false,
      depth: false,
      alpha: false,
      stencil: false,
      desynchronized: false,
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance',
    })
    if (!gl) throw new Error('GameRender: could not get WebGL context')
    this.gl = gl

    const { program, vloc, tloc } = createProgram(gl)
    const { mainTexture, prevTextures } = createTextures(gl, PREV_FRAMES)
    this.mainTexture = mainTexture
    this.prevTextures = prevTextures

    const { vertexBuffer, texcoordBuffer, prevBuffers } = createBuffers(gl, prevTextures)
    this.program = program
    this.zoomUniformLoc = gl.getUniformLocation(program, 'u_zoom')

    gl.uniform1i(gl.getUniformLocation(program, 'external_texture'), 0)
    this.setZoom(1)
    for (let i = 0; i < prevTextures.length; i++) {
      gl.uniform1i(
        gl.getUniformLocation(program, `u_prev_frame_texture[${i}]`),
        i + 1
      )
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer)
    gl.vertexAttribPointer(vloc, 2, gl.FLOAT, false, 0, 0)
    gl.enableVertexAttribArray(vloc)
    gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer)
    gl.vertexAttribPointer(tloc, 2, gl.FLOAT, false, 0, 0)
    gl.enableVertexAttribArray(tloc)

    this.prevBuffers = prevBuffers

    this.resize(window.innerWidth, window.innerHeight)
    requestAnimationFrame(this.render)
  }

  pause() {
    this.paused = true
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame)
      this.animationFrame = null
    }
  }

  resume() {
    if (this.paused) {
      this.paused = false
      this.animationFrame = requestAnimationFrame(this.render)
    }
  }

  /**
   * Letterbox-fit the requested (t, n) target into the current window, then
   * resize the canvas pixel buffer to (t, n). Order of operations matters —
   * this mirrors lb-phone exactly. Re-allocating the prev textures here is
   * what lets FiveM see the WebGL context as "fresh" each time.
   */
  resize(t, n) {
    const { gl } = this
    if (!gl) return

    const winW = window.innerWidth
    const winH = window.innerHeight
    const scale = Math.min(winW / t, winH / n)
    const fittedW = t * scale
    const fittedH = n * scale
    const offX = (fittedW - winW) / 2
    const offY = (fittedH - winH) / 2

    gl.canvas.width = winW
    gl.canvas.height = winH
    this.viewport = { x: offX, y: offY, width: winW, height: winH }
    gl.viewport(offX, offY, winW, winH)

    gl.canvas.width = t
    gl.canvas.height = n
    this.canvasSize = { width: t, height: n }

    for (const tex of this.prevTextures) {
      gl.bindTexture(gl.TEXTURE_2D, tex)
      gl.texImage2D(
        gl.TEXTURE_2D, 0, gl.RGBA, winW, winH, 0,
        gl.RGBA, gl.UNSIGNED_BYTE,
        new Uint8Array(winW * winH * 4)
      )
    }

    this.applyQuality()
    this.applyOffset()
  }

  resizeByAspect(aspect) {
    const winW = window.innerWidth
    const winH = window.innerHeight
    let w = winH * aspect
    let h = winW / aspect
    if (w > winW) w = winW
    else h = winH
    this.resize(w, h)
  }

  setQuality(q) {
    const { canvasSize } = this
    this.quality = q
    this.resize(canvasSize.width, canvasSize.height)
  }

  /** Optical zoom factor: 0.5 = ultrawide, 1 = normal, 2 = telephoto (affects preview + captures). */
  setZoom(opticalFactor) {
    const { gl, program, zoomUniformLoc, destroyed } = this
    if (destroyed || !gl || !program) return
    const z = typeof opticalFactor === 'number' && opticalFactor > 0 ? opticalFactor : 1
    this.zoom = z
    if (zoomUniformLoc != null) {
      gl.useProgram(program)
      gl.uniform1f(zoomUniformLoc, z)
    }
  }

  setXOffset(x) {
    const { canvasSize } = this
    this.xOffset = -x
    this.resize(canvasSize.width, canvasSize.height)
  }

  setYOffset(y) {
    const { canvasSize } = this
    this.yOffset = y
    this.resize(canvasSize.width, canvasSize.height)
  }

  applyQuality() {
    const { gl, quality, viewport, canvasSize } = this
    if (!gl) return
    const vx = viewport.x * quality
    const vy = viewport.y * quality
    const vw = viewport.width * quality
    const vh = viewport.height * quality
    gl.viewport(vx, vy, vw, vh)
    gl.canvas.width = canvasSize.width * quality
    gl.canvas.height = canvasSize.height * quality
  }

  applyOffset() {
    const { gl, xOffset, yOffset } = this
    if (!gl) return
    const winW = window.innerWidth
    const winH = window.innerHeight
    const [vx, vy, vw, vh] = gl.getParameter(gl.VIEWPORT)
    const fullW = vx * 2 + winW
    const fullH = vy * 2 + winH
    const px = vx + (winW - fullW) * xOffset
    const py = vy + (winH - fullH) * yOffset
    this.viewport = { x: px, y: py, width: vw, height: vh }
    gl.viewport(px, py, vw, vh)
  }

  /**
   * Same as lb-phone: snapshot the WebGL canvas itself. The canvas already
   * has the cell-cam feed rendered into it, so the blob is the photo. We
   * do NOT depend on screenshot-basic.
   */
  async takePhoto(mime = 'image/webp', quality = 0.92) {
    const { canvas, destroyed } = this
    if (destroyed) throw new Error('GameRender is destroyed; cannot take photo')
    if (!canvas) throw new Error('GameRender has not been initialized')
    return new Promise((resolve, reject) => {
      try {
        canvas.toBlob((blob) => {
          if (!blob) reject(new Error('canvas.toBlob returned null'))
          else resolve(blob)
        }, mime, quality)
      } catch (err) {
        reject(err)
      }
    })
  }

  /**
   * Convenience wrapper that returns a base64 data URL directly. Useful when
   * the photo is going straight to the gallery DB instead of being uploaded
   * to an image host.
   */
  takePhotoDataURL(mime = 'image/webp', quality = 0.92) {
    const { canvas, destroyed } = this
    if (destroyed) throw new Error('GameRender is destroyed; cannot take photo')
    if (!canvas) throw new Error('GameRender has not been initialized')
    return canvas.toDataURL(mime, quality)
  }

  /**
   * lb-phone style: record the live canvas stream to webm via MediaRecorder.
   * @param {(blob: Blob) => void} onComplete
   * @returns {{ stop: () => void, recorder?: MediaRecorder } | undefined}
   */
  startRecording(onComplete) {
    const { canvas, destroyed, recording } = this
    if (destroyed || recording || !canvas) return undefined
    if (typeof MediaRecorder === 'undefined' || !canvas.captureStream) return undefined

    const stream = canvas.captureStream(24)
    this.recordStream = stream

    const mimeCandidates = [
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm',
    ]
    let mimeType = ''
    for (const candidate of mimeCandidates) {
      if (MediaRecorder.isTypeSupported(candidate)) {
        mimeType = candidate
        break
      }
    }

    const chunks = []
    const options = mimeType
      ? { mimeType, videoBitsPerSecond: 2_500_000 }
      : { videoBitsPerSecond: 2_500_000 }
    const recorder = new MediaRecorder(stream, options)

    recorder.ondataavailable = (event) => {
      if (event.data?.size > 0) chunks.push(event.data)
    }

    recorder.onstop = () => {
      this.recording = false
      this.recorder = null
      if (this.recordStream) {
        this.recordStream.getTracks().forEach((track) => track.stop())
        this.recordStream = null
      }
      const type = mimeType || 'video/webm'
      const blob = new Blob(chunks, { type })
      if (blob.size > 0 && typeof onComplete === 'function') onComplete(blob)
    }

    recorder.onerror = () => {
      this.recording = false
      this.recorder = null
      if (this.recordStream) {
        this.recordStream.getTracks().forEach((track) => track.stop())
        this.recordStream = null
      }
    }

    recorder.start(250)
    this.recording = true
    this.recorder = recorder

    return {
      stop: () => {
        if (recorder.state === 'recording') recorder.stop()
      },
      recorder,
    }
  }

  /**
   * Note: React owns the <canvas> element via a ref. Unlike lb-phone, we
   * never remove it from the DOM here — that's the parent component's job.
   */
  destroy() {
    if (this.recorder?.state === 'recording') {
      try {
        this.recorder.stop()
      } catch {
        /* ignore */
      }
    }
    if (this.recordStream) {
      this.recordStream.getTracks().forEach((track) => track.stop())
      this.recordStream = null
    }
    this.recording = false
    this.recorder = null
    this.destroyed = true
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame)
      this.animationFrame = null
    }
    if (this.gl) {
      const ext = this.gl.getExtension('WEBGL_lose_context')
      if (ext) ext.loseContext()
      this.gl = null
    }
  }
}
