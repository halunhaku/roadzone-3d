import { useState } from 'react'
import { defaults, stake, validate } from '../zone/calc'
import type { Params } from '../zone/types'
import type { RoadLayout } from '../layout/buildLayout'

export function ParamPanel({
  params,
  onChange,
  layout,
}: {
  params: Params
  onChange: (next: Params) => void
  layout: RoadLayout
}) {
  const [folded, setFolded] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 720)
  const errors = validate(params)
  const startM = params.start
  const endStake =
    layout.zones[3] && Number.isFinite(layout.zones[3].end) ? stake(layout.zones[3].end) : '—'

  function set<K extends keyof Params>(key: K, value: Params[K]) {
    onChange({ ...params, [key]: value })
  }

  return (
    <aside
      className={folded ? 'panel panel-folded' : 'panel'}
      onWheel={(e) => e.stopPropagation()}
    >
      {folded ? (
        <button
          type="button"
          className="fold-tab"
          aria-expanded={false}
          aria-label="展开参数面板"
          onClick={() => setFolded(false)}
        >
          <svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <circle cx="8" cy="8" r="2.5" />
            <path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M3.4 12.6l1.4-1.4M11.2 4.8l1.4-1.4" />
          </svg>
          <span className="fold-tab-title">作业参数</span>
          <svg className="fold-tab-arrow" viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M6 3.5l4.5 4.5L6 12.5" />
          </svg>
        </button>
      ) : (
        <>
          <button
            type="button"
            className="fold"
            aria-expanded={true}
            aria-label="收起参数面板"
            onClick={() => setFolded(true)}
          >
            <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M10 3.5L5.5 8l4.5 4.5" />
            </svg>
            <span>收起</span>
          </button>
          <header className="panel-brand">
            <p className="eyebrow">JTG H30 · 3D 布置</p>
            <h1>路安作业区</h1>
            <p className="sub">3D 布置 · 锥桶 / 标志牌 / 路栏</p>
          </header>
      <div className="panel-body">
        <label className="field">
          <span>作业区起点（桩号）</span>
          <input
            value={params.start}
            placeholder="K123+800"
            aria-invalid={Boolean(errors.start)}
            onChange={(e) => set('start', e.target.value)}
          />
          {errors.start ? <em>{errors.start}</em> : null}
        </label>

        <div className="row">
          <label className="field">
            <span>作业区长度（m）</span>
            <input
              type="number"
              min={10}
              max={4000}
              value={finiteOrEmpty(params.work)}
              aria-invalid={Boolean(errors.work)}
              onChange={(e) => set('work', num(e.target.value))}
            />
            {errors.work ? <em>{errors.work}</em> : null}
          </label>
          <label className="field">
            <span>结束桩号</span>
            <input readOnly value={endStake} />
          </label>
        </div>

        <fieldset className="seg-field">
          <legend>作业区行车方向</legend>
          <div className="seg" role="radiogroup" aria-label="作业区行车方向">
            <SegBtn active={params.direction === 'up'} onClick={() => set('direction', 'up')}>
              ↑ 上行 (桩号递增)
            </SegBtn>
            <SegBtn active={params.direction === 'down'} onClick={() => set('direction', 'down')}>
              ↓ 下行 (桩号递减)
            </SegBtn>
          </div>
        </fieldset>

        <fieldset className="seg-field">
          <legend>施工位置</legend>
          <div className="seg" role="radiogroup" aria-label="施工位置">
            <SegBtn
              active={params.workSide === 'roadside'}
              onClick={() => onChange({ ...params, workSide: 'roadside', doubleSide: false })}
            >
              路侧
            </SegBtn>
            <SegBtn active={params.workSide === 'median'} onClick={() => set('workSide', 'median')}>
              中央分隔带
            </SegBtn>
          </div>
          {errors.workSide ? <em className="err">{errors.workSide}</em> : null}
        </fieldset>

        {params.workSide === 'median' ? (
          <fieldset className="seg-field">
            <legend>占路方式</legend>
            <div className="seg" role="radiogroup" aria-label="占路方式">
              <SegBtn active={!params.doubleSide} onClick={() => set('doubleSide', false)}>
                单侧占路
              </SegBtn>
              <SegBtn active={params.doubleSide} onClick={() => set('doubleSide', true)}>
                双侧占路
              </SegBtn>
            </div>
          </fieldset>
        ) : null}
        <div className="closure-badge">
          {params.workSide === 'roadside'
            ? '封闭外侧车道与应急车道（内侧车道正常通行）'
            : params.doubleSide
              ? '上下行均封闭中分带内侧超车道（外侧车道正常通行）'
              : '仅封闭施工侧内侧超车道（外侧车道正常通行）'}
        </div>

        <div className="row">
          <label className="field">
            <span>过渡区（m）</span>
            <input
              type="number"
              min={120}
              max={200}
              value={finiteOrEmpty(params.taper)}
              aria-invalid={Boolean(errors.taper)}
              onChange={(e) => set('taper', num(e.target.value))}
            />
            {errors.taper ? <em>{errors.taper}</em> : null}
          </label>
          <label className="field">
            <span>缓冲区（m）</span>
            <input
              type="number"
              min={100}
              max={150}
              value={finiteOrEmpty(params.buffer)}
              aria-invalid={Boolean(errors.buffer)}
              onChange={(e) => set('buffer', num(e.target.value))}
            />
            {errors.buffer ? <em>{errors.buffer}</em> : null}
          </label>
        </div>

        <details className="advanced">
          <summary>高级参数</summary>
          <p className="hint">警告区固定 1,600 m。锥桶按 70 cm 实尺、设定间距摆放（示意比例下作业区被压短，看起来会更密）。</p>
          <div className="row">
            <label className="field">
              <span>下游过渡区（m）</span>
              <input
                type="number"
                min={30}
                value={finiteOrEmpty(params.downstream)}
                aria-invalid={Boolean(errors.downstream)}
                onChange={(e) => set('downstream', num(e.target.value))}
              />
              {errors.downstream ? <em>{errors.downstream}</em> : null}
            </label>
            <label className="field">
              <span>终止区（m）</span>
              <input
                type="number"
                min={30}
                value={finiteOrEmpty(params.terminal)}
                aria-invalid={Boolean(errors.terminal)}
                onChange={(e) => set('terminal', num(e.target.value))}
              />
              {errors.terminal ? <em>{errors.terminal}</em> : null}
            </label>
          </div>
          <div className="row">
            <label className="field">
              <span>锥桶间距（m）</span>
              <input
                type="number"
                min={1}
                max={4}
                value={finiteOrEmpty(params.coneGap)}
                aria-invalid={Boolean(errors.coneGap)}
                onChange={(e) => set('coneGap', num(e.target.value))}
              />
              {errors.coneGap ? <em>{errors.coneGap}</em> : null}
            </label>
            <label className="field">
              <span>设计速度</span>
              <select value={params.speed} onChange={(e) => set('speed', Number(e.target.value))}>
                <option value={100}>100 km/h</option>
                <option value={80}>80 km/h</option>
              </select>
            </label>
          </div>
        </details>

        <dl className="stats">
          <div>
            <dt>单侧布置</dt>
            <dd>{layout.totalMeters.toLocaleString()} m</dd>
          </div>
          <div>
            <dt>作业区</dt>
            <dd>
              {startM} → {endStake}
            </dd>
          </div>
          <div>
            <dt>影响路段</dt>
            <dd>
              {stake(layout.extent.min)} — {stake(layout.extent.max)}
            </dd>
          </div>
        </dl>
        <div className="panel-actions">
          <button type="button" className="btn-reset" onClick={() => onChange(defaults)}>
            ↺ 恢复默认配置
          </button>
        </div>
      </div>
        </>
      )}
    </aside>
  )
}

function SegBtn({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: string
}) {
  return (
    <button type="button" role="radio" aria-checked={active} className={active ? 'on' : ''} onClick={onClick}>
      {children}
    </button>
  )
}

function num(v: string) {
  return v === '' ? Number.NaN : Number(v)
}

function finiteOrEmpty(n: number) {
  return Number.isFinite(n) ? n : ''
}
