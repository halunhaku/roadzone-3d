import { useEffect, useMemo, useRef, useState } from 'react'
import { buildLayout } from './layout/buildLayout'
import { buildDevices, type SignSpot } from './layout/devices'
import { RoadScene, type CameraApi, type CaptureFn } from './scene/RoadScene'
import { PlanHost } from './diagram/PlanHost'
import { exportPlanA4, overlayUiOnScene, pngFilename, saveBlob } from './ui/exportPng'
import { Hud } from './ui/Hud'
import { ParamPanel } from './ui/ParamPanel'
import { ViewBar, type ExportKind } from './ui/ViewBar'
import { defaults, stake } from './zone/calc'
import type { Params } from './zone/types'

export default function App() {
  const [params, setParams] = useState<Params>(defaults)
  const [selected, setSelected] = useState<SignSpot | null>(null)
  const [exporting, setExporting] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const toastTimerRef = useRef<number | null>(null)
  const captureRef = useRef<CaptureFn | null>(null)
  const cameraRef = useRef<CameraApi | null>(null)
  const appRef = useRef<HTMLDivElement>(null)
  const planRef = useRef<HTMLDivElement>(null)
  const exportingLock = useRef(false)
  const layout = useMemo(() => buildLayout(params, 'schematic'), [params])
  const devices = useMemo(() => buildDevices(layout, params), [layout, params])

  function showToast(msg: string, duration = 3000) {
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current)
    setToast(msg)
    toastTimerRef.current = window.setTimeout(() => {
      setToast(null)
      toastTimerRef.current = null
    }, duration)
  }

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelected(null)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
  async function exportPng(kind: ExportKind) {
    if (exportingLock.current) return
    const capture = captureRef.current
    const app = appRef.current
    const sceneCanvas = app?.querySelector('canvas')
    if (!capture || !app || !sceneCanvas) return
    exportingLock.current = true
    setExporting(true)
    showToast('正在生成导出图片…', 6000)
    try {
      const work = layout.zones[3]
      let blob: Blob
      let extra = 'scene'
      if (kind === 'plan') {
        const host = planRef.current
        if (!host) return
        const pages = await exportPlanA4(host, params, layout.zones)
        const tag = work ? stake(work.start) : 'zone'
        saveBlob(pages.diagram, pngFilename(`A4-布置图-${tag}`))
        window.setTimeout(() => saveBlob(pages.table, pngFilename(`A4-一览表-${tag}`)), 400)
        showToast('已导出 A4 布置图与设施一览表 (PNG)')
        return
      }
      const scene = await capture()
      blob = kind === 'ui' ? await overlayUiOnScene(scene, app, sceneCanvas) : scene
      extra = kind === 'ui' ? 'ui' : 'scene'
      const label = `schematic-${extra}-${work ? stake(work.start) : 'zone'}`
      saveBlob(blob, pngFilename(label))
      showToast(kind === 'ui' ? '已导出含 UI 界面截图 (PNG)' : '已导出 3D 画面截图 (PNG)')
    } catch (err) {
      console.error('export png failed', err)
      showToast('导出图片失败，请重试')
      exportingLock.current = false
      setExporting(false)
    }
  }

  return (
    <div className="app" ref={appRef}>
      <div className="stage-frame">
        <RoadScene
          layout={layout}
          params={params}
          devices={devices}
          selectedId={selected?.id ?? null}
          onSelectSign={setSelected}
          onMiss={() => setSelected(null)}
          captureRef={captureRef}
          cameraRef={cameraRef}
        />
        <ParamPanel params={params} onChange={setParams} layout={layout} />
        <ViewBar
          onExport={exportPng}
          exporting={exporting}
          onRotate={(d) => cameraRef.current?.rotate(d)}
          onZoom={(f) => cameraRef.current?.zoom(f)}
          onReset={() => cameraRef.current?.reset()}
        />
        <Hud layout={layout} selected={selected} onClear={() => setSelected(null)} />
        {toast ? <div className="toast" role="status" aria-live="polite">{toast}</div> : null}
      </div>
      <PlanHost params={params} layout={layout} hostRef={planRef} />
    </div>
  )
}
