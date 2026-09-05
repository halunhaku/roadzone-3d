import { toPng } from 'html-to-image'
import { buildScheduleSvg } from '../diagram/schedule'
import type { Params, Zone } from '../zone/types'

export function pngFilename(label: string) {
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
  const safe = label.replace(/[^\w+\u4e00-\u9fff-]+/g, '_')
  return `roadzone-${safe}-${stamp}.png`
}

export function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1500)
}

export function canvasToPng(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob && blob.size > 0) {
        resolve(blob)
        return
      }
      try {
        const data = canvas.toDataURL('image/png')
        const bytes = atob(data.split(',')[1] ?? '')
        const buf = new Uint8Array(bytes.length)
        for (let i = 0; i < bytes.length; i++) buf[i] = bytes.charCodeAt(i)
        resolve(new Blob([buf], { type: 'image/png' }))
      } catch (err) {
        reject(err instanceof Error ? err : new Error('截图失败'))
      }
    }, 'image/png')
  })
}

function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('image load failed'))
    img.src = src
  })
}

/** 3D 画面垫底，再把参数面板、顶栏、图例逐块叠上去。 */
export async function overlayUiOnScene(sceneBlob: Blob, app: HTMLElement, _sceneCanvas: HTMLCanvasElement): Promise<Blob> {
  const dpr = Math.min(2, window.devicePixelRatio || 1)
  const w = app.clientWidth
  const h = app.clientHeight
  const out = document.createElement('canvas')
  out.width = Math.max(1, Math.round(w * dpr))
  out.height = Math.max(1, Math.round(h * dpr))
  const ctx = out.getContext('2d')
  if (!ctx) throw new Error('截图失败')
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.fillStyle = '#1c1b19'
  ctx.fillRect(0, 0, w, h)

  const sceneUrl = URL.createObjectURL(sceneBlob)
  app.classList.add('capture-flat')
  try {
    ctx.drawImage(await loadImg(sceneUrl), 0, 0, w, h)
    const nodes = ['.panel', '.viewbar', '.legend', '.sign-card', '.hint-bar']
      .map((sel) => app.querySelector(sel))
      .filter((el): el is HTMLElement => el instanceof HTMLElement)
    for (const el of nodes) {
      const rect = el.getBoundingClientRect()
      if (rect.width < 2 || rect.height < 2) continue
      const prev = {
        background: el.style.background,
        backdrop: el.style.backdropFilter,
        transform: el.style.transform,
      }
      el.style.background = 'rgba(28, 26, 23, 0.94)'
      el.style.backdropFilter = 'none'
      el.style.setProperty('-webkit-backdrop-filter', 'none')
      try {
        const piece = await toPng(el, {
          pixelRatio: dpr,
          skipFonts: true,
          fontEmbedCSS: '/* local */',
          width: Math.ceil(rect.width),
          height: Math.ceil(rect.height),
          style: {
            transform: 'none',
            left: '0px',
            top: '0px',
            right: 'auto',
            bottom: 'auto',
            position: 'relative',
            margin: '0',
            background: 'rgba(28, 26, 23, 0.94)',
            backdropFilter: 'none',
          },
          onImageErrorHandler: () => undefined,
        })
        ctx.drawImage(await loadImg(piece), rect.left, rect.top, rect.width, rect.height)
      } catch {
        /* 单块 UI 失败时仍保留 3D 画面 */
      } finally {
        el.style.background = prev.background
        el.style.backdropFilter = prev.backdrop
        el.style.transform = prev.transform
        el.style.removeProperty('-webkit-backdrop-filter')
      }
    }
  } finally {
    app.classList.remove('capture-flat')
    URL.revokeObjectURL(sceneUrl)
  }

  return canvasToPng(out)
}

async function svgXmlToCanvas(xml: string, fallbackW = 1100, fallbackH = 800, scale = 2): Promise<HTMLCanvasElement> {
  const match = xml.match(/viewBox="([^"]+)"/)
  const parts = match?.[1]?.split(/[\s,]+/).map(Number) ?? []
  const vbW = parts[2] || fallbackW
  const vbH = parts[3] || fallbackH
  const url = URL.createObjectURL(new Blob([xml], { type: 'image/svg+xml;charset=utf-8' }))
  try {
    const img = await loadImg(url)
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(vbW * scale))
    canvas.height = Math.max(1, Math.round(vbH * scale))
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('截图失败')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    return canvas
  } finally {
    URL.revokeObjectURL(url)
  }
}

const A4 = { w: 1588, h: 2246 }

function planSubtitle(params: Params, zones: Zone[]) {
  const dir = params.doubleSide ? '上/下行' : params.direction === 'down' ? '下行' : '上行'
  const side = params.workSide === 'median' ? '中央分隔带' : '路侧'
  const total = zones.reduce((s, z) => s + z.length, 0)
  return `作业区起点：${params.start}　方向：${dir}　施工位置：${side}${params.doubleSide ? '（双侧占路）' : ''}　布置总长度：${total}m`
}

function paintA4(
  content: HTMLCanvasElement,
  title: string,
  subtitle: string,
  pageNo: number,
  pageCount: number,
  align: 'center' | 'top' = 'center',
): HTMLCanvasElement {
  const page = document.createElement('canvas')
  page.width = A4.w
  page.height = A4.h
  const ctx = page.getContext('2d')
  if (!ctx) throw new Error('截图失败')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, A4.w, A4.h)
  const m = 44
  ctx.strokeStyle = '#1d1d1f'
  ctx.lineWidth = 2
  ctx.strokeRect(m, m, A4.w - m * 2, A4.h - m * 2)
  ctx.fillStyle = '#1d1d1f'
  ctx.font = '700 36px "PingFang SC","Microsoft YaHei",sans-serif'
  ctx.fillText(title, m + 24, m + 48)
  ctx.font = '400 20px "PingFang SC","Microsoft YaHei",sans-serif'
  ctx.fillStyle = '#4a4a4f'
  ctx.fillText(subtitle, m + 24, m + 80)
  ctx.fillStyle = '#6e6e73'
  ctx.font = '400 20px "PingFang SC","Microsoft YaHei",sans-serif'
  ctx.textAlign = 'right'
  ctx.fillText(`图 ${pageNo}　共 ${pageCount} 页`, A4.w - m - 24, m + 48)
  ctx.textAlign = 'left'
  const footerY = A4.h - m - 56
  ctx.beginPath()
  ctx.moveTo(m + 16, footerY)
  ctx.lineTo(A4.w - m - 16, footerY)
  ctx.strokeStyle = '#1d1d1f'
  ctx.lineWidth = 1
  ctx.stroke()
  ctx.fillStyle = '#6e6e73'
  ctx.font = '400 16px "PingFang SC","Microsoft YaHei",sans-serif'
  ctx.fillText('锥桶数量仅表示布置走向，现场按设定的 1-4m 间距放样。', m + 24, footerY + 22)
  ctx.fillText('正式实施前，请依据道路等级、设计速度、施工类型及当地现行规范复核。', m + 24, footerY + 42)
  ctx.textAlign = 'right'
  ctx.fillText('A4 纵向 · 比例示意', A4.w - m - 24, footerY + 32)
  ctx.textAlign = 'left'
  const boxX = m + 20
  const boxY = m + 100
  const boxW = A4.w - (m + 20) * 2
  const boxH = footerY - boxY - 16
  ctx.fillStyle = '#f8fafc'
  ctx.fillRect(boxX, boxY, boxW, boxH)
  const scale = Math.min(boxW / content.width, boxH / content.height)
  const dw = content.width * scale
  const dh = content.height * scale
  const dx = boxX + (boxW - dw) / 2
  const dy = align === 'top' ? boxY + 8 : boxY + (boxH - dh) / 2
  ctx.drawImage(content, dx, dy, dw, dh)
  return page
}

export async function exportPlanA4(
  host: HTMLElement,
  params: Params,
  zones: Zone[],
): Promise<{ diagram: Blob; table: Blob }> {
  const svgs = [...host.querySelectorAll<SVGSVGElement>('svg.roadSvg')]
  if (svgs.length === 0) throw new Error('布置图未生成')
  const diagrams: HTMLCanvasElement[] = []
  for (const svg of svgs) {
    const clone = svg.cloneNode(true) as SVGSVGElement
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
    diagrams.push(await svgXmlToCanvas(new XMLSerializer().serializeToString(clone)))
  }
  let diagramSheet = diagrams[0]!
  if (diagrams.length > 1) {
    const gap = 24
    const w = Math.max(...diagrams.map((p) => p.width))
    const h = diagrams.reduce((s, p) => s + p.height, 0) + gap * (diagrams.length - 1)
    const stacked = document.createElement('canvas')
    stacked.width = w
    stacked.height = h
    const sctx = stacked.getContext('2d')
    if (!sctx) throw new Error('截图失败')
    sctx.fillStyle = '#ffffff'
    sctx.fillRect(0, 0, w, h)
    let y = 0
    for (const piece of diagrams) {
      sctx.drawImage(piece, (w - piece.width) / 2, y)
      y += piece.height + gap
    }
    diagramSheet = stacked
  }
  const tableSheet = await svgXmlToCanvas(buildScheduleSvg(params, zones), 1100, 600, 2)
  const sub = planSubtitle(params, zones)
  const pageCount = 2
  return {
    diagram: await canvasToPng(paintA4(diagramSheet, '高速公路作业区布置图', sub, 1, pageCount)),
    table: await canvasToPng(paintA4(tableSheet, '高速公路作业区一览表', sub, 2, pageCount, 'top')),
  }
}
