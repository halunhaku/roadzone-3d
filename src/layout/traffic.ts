import type { RoadLayout } from './buildLayout'
import type { Params } from '../zone/types'

export interface TrafficPath {
  xClosed: number
  xOpen: number
  dir: 1 | -1
  mergeStart: number
  mergeEnd: number
  merges: boolean
}

function mid(a: number, b: number) {
  return (a + b) / 2
}

function zAt(seg: { z0: number; z1: number; meters: number }, offsetM: number) {
  const t = offsetM / Math.max(1, seg.meters)
  return seg.z0 + t * (seg.z1 - seg.z0)
}

/** 作业方向沿布置图 +Z；对向 -Z。封闭车道的车开到「车道减少」牌再并入。 */
export function trafficPaths(layout: RoadLayout, params: Params): TrafficPath[] {
  const closeInner = params.workSide === 'median' || params.doubleSide
  const warn = layout.segments[0]!
  const taper = layout.segments[1]!
  const work = layout.segments[3]!
  const cz = (work.z0 + work.z1) / 2
  const signZ = zAt(warn, Math.min(1200, warn.meters))
  const room = Math.max(6, taper.z0 - signZ)
  const mergeLen = Math.min(room * 0.85, layout.mode === 'schematic' ? 110 : 160)
  const primaryStart = signZ
  const primaryEnd = signZ + mergeLen

  const paths: TrafficPath[] = []
  const add = (which: 'up' | 'down', closed: boolean) => {
    const cw = which === 'up' ? layout.cs.UP : layout.cs.DOWN
    const inner = mid(cw.innerLane.x0, cw.innerLane.x1)
    const outer = mid(cw.outerLane.x0, cw.outerLane.x1)
    const openX = closeInner ? outer : inner
    const closedX = closeInner ? inner : outer
    const dir: 1 | -1 = params.doubleSide ? (which === 'up' ? 1 : -1) : which === params.direction ? 1 : -1
    if (!closed) {
      paths.push(steady(inner, dir), steady(outer, dir))
      return
    }
    paths.push(steady(openX, dir))
    let mergeStart = primaryStart
    let mergeEnd = primaryEnd
    if (dir < 0) {
      mergeStart = 2 * cz - primaryStart
      mergeEnd = 2 * cz - primaryEnd
    }
    paths.push({
      xClosed: closedX,
      xOpen: openX,
      dir,
      mergeStart,
      mergeEnd,
      merges: true,
    })
  }
  add('up', params.direction === 'up' || params.doubleSide)
  add('down', params.direction === 'down' || params.doubleSide)
  return paths
}

function steady(x: number, dir: 1 | -1): TrafficPath {
  return { xClosed: x, xOpen: x, dir, mergeStart: 0, mergeEnd: 0, merges: false }
}

export function pathX(path: TrafficPath, z: number) {
  if (!path.merges) return path.xOpen
  const span = path.mergeEnd - path.mergeStart
  if (Math.abs(span) < 1e-4) return path.xOpen
  let t = (z - path.mergeStart) / span
  t = Math.min(1, Math.max(0, t))
  t = t * t * (3 - 2 * t)
  return path.xClosed + (path.xOpen - path.xClosed) * t
}

export function pathYaw(path: TrafficPath, z: number) {
  const base = path.dir > 0 ? 0 : Math.PI
  if (!path.merges) return base
  const span = path.mergeEnd - path.mergeStart
  if (Math.abs(span) < 1e-4) return base
  let t = (z - path.mergeStart) / span
  t = Math.min(1, Math.max(0, t))
  if (t <= 0 || t >= 1) return base
  const ds = 6 * t * (1 - t)
  const dxdz = ((path.xOpen - path.xClosed) * ds) / span
  return Math.atan2(dxdz * path.dir, path.dir)
}

export function displaySpeed(params: Params, totalLength: number, totalMeters: number): number {
  const mps = Math.max(40, params.speed) / 3.6
  return mps * (totalLength / Math.max(1, totalMeters))
}
