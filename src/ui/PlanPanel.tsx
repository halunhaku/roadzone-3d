import type { RefObject } from 'react'
import { ZoneDiagrams } from '../diagram/RoadDiagram'
import type { Params } from '../zone/types'
import type { RoadLayout } from '../layout/buildLayout'

export function PlanPanel({
  params,
  layout,
  folded,
  onToggleFold,
  hostRef,
}: {
  params: Params
  layout: RoadLayout
  folded: boolean
  onToggleFold: () => void
  hostRef: RefObject<HTMLDivElement | null>
}) {
  return (
    <aside className={folded ? 'plan-panel panel-folded' : 'plan-panel'}>
      {folded ? (
        <button
          type="button"
          className="fold-tab"
          aria-expanded={false}
          aria-label="展开布置图栏"
          onClick={onToggleFold}
        >
          <svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <rect x="2" y="2.5" width="12" height="11" rx="1.5" />
            <path d="M2 6h12M6 6v7.5" />
          </svg>
          <span className="fold-tab-title">布置图</span>
          <svg className="fold-tab-arrow" viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M10 3.5L5.5 8l4.5 4.5" />
          </svg>
        </button>
      ) : (
        <button
          type="button"
          className="fold"
          aria-expanded={true}
          aria-label="收起布置图栏"
          onClick={onToggleFold}
        >
          <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M6 3.5l4.5 4.5L6 12.5" />
          </svg>
          <span>收起</span>
        </button>
      )}

      <header className="panel-brand">
        <p className="eyebrow">JTG H30 · 规程图式</p>
        <h1>2D 布置图</h1>
        <p className="sub">与 3D 同步联动 · 导出同源</p>
      </header>

      <div className="panel-body plan-body" ref={hostRef}>
        <ZoneDiagrams
          zones={layout.zones}
          direction={params.direction}
          workSide={params.workSide}
          doubleSide={params.doubleSide}
          zoom={1}
          coneGap={params.coneGap}
          speed={params.speed}
          vertical
        />
      </div>
    </aside>
  )
}
