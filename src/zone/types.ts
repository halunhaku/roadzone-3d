export type Direction = 'up' | 'down'
export type WorkSide = 'roadside' | 'median'
export type ScaleMode = 'schematic' | 'true'
export type CameraMode = 'orbit' | 'along'
export type SignType =
  | 'construction1600'
  | 'construction800'
  | 'length'
  | 'smart'
  | 'limit80'
  | 'limit60'
  | 'limit40'
  | 'laneLeft'
  | 'laneRight'
  | 'noOvertake'
  | 'arrowLeft'
  | 'arrowRight'
  | 'end60'
  | 'end40'
  | 'endOvertake'
  | 'fence'

export interface Params {
  start: string
  work: number
  direction: Direction
  workSide: WorkSide
  doubleSide: boolean
  warning: number
  taper: number
  buffer: number
  downstream: number
  terminal: number
  speed: number
  coneGap: number
}

export interface ZoneMeta {
  key: string
  name: string
  color: string
  description: string
}

export interface Zone extends ZoneMeta {
  length: number
  start: number
  end: number
}
