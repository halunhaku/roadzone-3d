import { mirrorZones, speedLimits, stake, warningSignOffsets } from '../zone/calc'
import type { Direction, Params, Zone } from '../zone/types'

function xmlText(value: string | number) {
  return String(value).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[ch]!)
}

function warningNames(speed: number): Record<number, string> {
  const limits = speedLimits(speed)
  return {
    0: '前方施工 1600m',
    400: '关闭智驾',
    800: `限速 ${limits.first}`,
    1000: `限速 ${limits.final}`,
    1200: '禁止超车 / 车道减少',
  }
}

const WARN_DESCS: Record<number, string> = {
  0: '0m / 警告区起点',
  400: '距警告区起点 400m',
  800: '距警告区起点 800m',
  1000: '距警告区起点 1000m',
  1200: '距警告区起点 1200m',
}

function signRowsOf(zones: Zone[], speed: number): [string, number, string][] {
  const at = (zone: Zone, offset: number) => zone.start + Math.sign(zone.end - zone.start) * offset
  const warnLen = zones[0]!.length
  const names = warningNames(speed)
  const limits = speedLimits(speed)
  return [
    ...warningSignOffsets
      .filter((offset) => offset <= warnLen)
      .map((offset) => [names[offset]!, at(zones[0]!, offset), WARN_DESCS[offset]!] as [string, number, string]),
    ['导向标志牌', at(zones[1]!, 50), '过渡区内 50m'],
    ['路栏 / 作业区长度', zones[2]!.start, '缓冲区入口'],
    [`解除限速 ${limits.final} / 禁止超车`, zones[5]!.end, '终止区终点'],
  ]
}

function scaleColumns(weights: number[], width: number) {
  const sum = weights.reduce((s, n) => s + n, 0)
  return weights.map((w) => (w / sum) * width)
}

function exportTable({
  x,
  y,
  width,
  title,
  headers,
  rows,
  columnWidths,
  titleHeight = 32,
  rowHeight = 28,
  headerHeight = 30,
  height,
}: {
  x: number
  y: number
  width: number
  title: string
  headers: string[]
  rows: string[][]
  columnWidths: number[]
  titleHeight?: number
  rowHeight?: number
  headerHeight?: number
  height?: number
}) {
  if (height && height > 0 && rows.length > 0) {
    const base = titleHeight + headerHeight + rows.length * rowHeight
    const cap = Math.min(Math.max(height / base, 0.9), 2.4)
    titleHeight = Math.round(titleHeight * cap)
    headerHeight = Math.round(headerHeight * cap)
    rowHeight = (height - titleHeight - headerHeight) / rows.length
  }
  const fs = Math.max(11, Math.min(22, rowHeight * 0.32))
  const tfs = Math.max(13, Math.min(24, titleHeight * 0.42))
  const offsets = columnWidths.reduce<number[]>((list, value) => {
    list.push((list[list.length - 1] ?? 0) + value)
    return list
  }, [0])
  const tableH = titleHeight + headerHeight + rows.length * rowHeight
  const verticals = offsets
    .slice(1, -1)
    .map((offset) => `<line x1="${x + offset}" y1="${y + titleHeight}" x2="${x + offset}" y2="${y + tableH}"/>`)
    .join('')
  const horizontals = Array.from({ length: rows.length + 1 }, (_, index) =>
    `<line x1="${x}" y1="${y + titleHeight + headerHeight + index * rowHeight}" x2="${x + width}" y2="${y + titleHeight + headerHeight + index * rowHeight}"/>`,
  ).join('')
  const cellBaseline = (h: number, s: number) => (h - s) / 2 + s * 0.82
  const cellText = (cells: string[], rowY: number, fontWeight = '400', fill = '#1d1d1f') =>
    cells
      .map(
        (cell, index) =>
          `<text x="${x + offsets[index]! + columnWidths[index]! / 2}" y="${rowY}" text-anchor="middle" font-size="${fs}" font-weight="${fontWeight}" fill="${fill}">${xmlText(cell)}</text>`,
      )
      .join('')
  const zebra = rows
    .map((_, index) =>
      index % 2 === 1
        ? `<rect x="${x}" y="${y + titleHeight + headerHeight + index * rowHeight}" width="${width}" height="${rowHeight}" fill="#f7f7f8"/>`
        : '',
    )
    .join('')
  return [
    `<rect x="${x}" y="${y}" width="${width}" height="${tableH}" fill="#fff"/>`,
    `<rect x="${x}" y="${y}" width="${width}" height="${titleHeight}" fill="#eef1f4"/>`,
    `<rect x="${x}" y="${y + titleHeight}" width="${width}" height="${headerHeight}" fill="#f3f4f6"/>`,
    zebra,
    `<g stroke="#1d1d1f" stroke-width="0.7" fill="none">`,
    `<line x1="${x}" y1="${y + titleHeight}" x2="${x + width}" y2="${y + titleHeight}"/>`,
    verticals,
    horizontals,
    `</g>`,
    `<rect x="${x}" y="${y}" width="${width}" height="${tableH}" fill="none" stroke="#1d1d1f" stroke-width="1.1"/>`,
    `<text x="${x + 12}" y="${y + cellBaseline(titleHeight, tfs)}" font-size="${tfs}" font-weight="700" fill="#1d1d1f">${xmlText(title)}</text>`,
    cellText(headers, y + titleHeight + cellBaseline(headerHeight, fs), '700', '#3a3a3c'),
    rows
      .map((row, index) =>
        cellText(row, y + titleHeight + headerHeight + index * rowHeight + cellBaseline(rowHeight, fs)),
      )
      .join(''),
  ].join('')
}

export function buildScheduleSvg(params: Params, zones: Zone[]): string {
  const doubleSide = params.doubleSide
  const primaryDir: Direction = params.direction
  const primaryLabel = primaryDir === 'down' ? '下行' : '上行'
  const mirrorLabel = primaryLabel === '上行' ? '下行' : '上行'
  const mirrored = doubleSide ? mirrorZones(zones, primaryDir) : null
  const zoneRows = mirrored
    ? zones.map((zone, index) => [
        String(index + 1),
        zone.name,
        `${zone.length}m`,
        stake(zone.start),
        stake(zone.end),
        stake(mirrored[index]!.start),
        stake(mirrored[index]!.end),
      ])
    : zones.map((zone, index) => [String(index + 1), zone.name, `${zone.length}m`, stake(zone.start), stake(zone.end)])
  const primaryItems = signRowsOf(zones, params.speed)
  const mirrorItems = mirrored ? signRowsOf(mirrored, params.speed) : null
  const signRows = mirrored
    ? primaryItems.map((item, index) => [
        String(index + 1),
        item[0],
        stake(item[1]),
        stake(mirrorItems![index]![1]),
        item[2],
      ])
    : primaryItems.map((item, index) => [String(index + 1), item[0], stake(item[1]), item[2]])
  const zoneHeaders = mirrored
    ? ['序号', '分区名称', '长度', `${primaryLabel}起点`, `${primaryLabel}终点`, `${mirrorLabel}起点`, `${mirrorLabel}终点`]
    : ['序号', '分区名称', '长度', '起点桩号', '终点桩号']
  const signHeaders = mirrored
    ? ['序号', '标志牌名称', `${primaryLabel}桩号`, `${mirrorLabel}桩号`, '位置说明']
    : ['序号', '标志牌名称', '设置桩号', '位置说明']
  const zoneWeights = mirrored ? [40, 90, 56, 86, 86, 86, 86] : [48, 140, 80, 180, 180]
  const signWeights = mirrored ? [40, 160, 90, 90, 180] : [48, 220, 140, 240]
  const width = 1100
  const height = 1496
  const x = 24
  const innerW = width - 48
  const gap = 16
  const usable = height - 48
  const zoneWeight = zoneRows.length + 2.4
  const signWeight = signRows.length + 2.4
  const zoneH = (usable - gap) * zoneWeight / (zoneWeight + signWeight)
  const signH = usable - gap - zoneH
  const tables = [
    exportTable({
      x,
      y: 24,
      width: innerW,
      height: zoneH,
      title: '表 1　各区域起止点',
      headers: zoneHeaders,
      rows: zoneRows,
      columnWidths: scaleColumns(zoneWeights, innerW),
    }),
    exportTable({
      x,
      y: 24 + zoneH + gap,
      width: innerW,
      height: signH,
      title: '表 2　各标志牌位置',
      headers: signHeaders,
      rows: signRows,
      columnWidths: scaleColumns(signWeights, innerW),
    }),
  ].join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}"><rect width="${width}" height="${height}" fill="#fff"/><g font-family="PingFang SC,Microsoft YaHei,sans-serif">${tables}</g></svg>`
}
