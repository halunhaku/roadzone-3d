import { useState } from 'react'
import type { RoadLayout } from '../layout/buildLayout'
import type { SignSpot } from '../layout/devices'
import { stake } from '../zone/calc'

export function Hud({
  layout,
  selected,
  onClear,
}: {
  layout: RoadLayout
  selected: SignSpot | null
  onClear: () => void
}) {
  const [legendFolded, setLegendFolded] = useState(false)

  return (
    <>
      <div className={`legend-box ${legendFolded ? 'legend-collapsed' : ''}`}>
        <div
          className="legend-head"
          onClick={() => setLegendFolded((f) => !f)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && setLegendFolded((f) => !f)}
        >
          <span className="legend-title">JTG H30 分区</span>
          <span className="legend-toggle">{legendFolded ? '展开' : '收起'}</span>
        </div>
        {!legendFolded ? (
          <ol className="legend">
            {layout.segments.map((seg) => (
              <li key={seg.key}>
                <i style={{ background: seg.color }} />
                <span className="legend-name">{seg.name}</span>
                <span className="legend-stake">
                  {stake(seg.startStake)} ~ {stake(seg.endStake)}
                </span>
                <b className="legend-m">{seg.meters} m</b>
              </li>
            ))}
          </ol>
        ) : null}
      </div>

      {selected ? (
        <article className="sign-card" aria-label="标志牌详情">
          <header>
            <p>养护安全标志</p>
            <button type="button" onClick={onClear} aria-label="关闭详情">
              ×
            </button>
          </header>
          <div className="sign-card-body">
            <div className="sign-thumb-wrap">
              <img src={`/signs/${selected.type}.png`} alt={selected.title} className="sign-thumb" />
            </div>
            <div className="sign-info">
              <h2>{selected.title}</h2>
              <dl>
                <div>
                  <dt>布置桩号</dt>
                  <dd>{selected.stakeLabel}</dd>
                </div>
                <div>
                  <dt>布设位置</dt>
                  <dd>{selected.desc}</dd>
                </div>
              </dl>
            </div>
          </div>
        </article>
      ) : null}
      <p className="hint-bar">顶栏微调视角 · 拖拽旋转 / 滚轮缩放 · 点选道路标志牌查看详规</p>
    </>
  )
}
