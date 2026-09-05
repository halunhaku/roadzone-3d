import { useLayoutEffect, useMemo } from 'react'
import * as THREE from 'three'
import type { RoadLayout } from '../layout/buildLayout'
import type { CrossSection } from '../layout/crossSection'
import type { DeviceLayout, SignSpot } from '../layout/devices'
import type { Params } from '../zone/types'
import { ClosedLanes } from './ClosedLanes'
import { Cones } from './Cones'
import { LaneMarks, useLaneMarkingGeometry } from './markings'
import { Signs } from './Signs'
import { Traffic } from './Traffic'
import { useRoadTextures } from './textures'
import { WorkVehicles } from './WorkVehicles'

function asphaltRepeat(length: number, width: number) {
  return new THREE.Vector2(width / 8, Math.max(8, length / 8))
}

export function Roadway({
  layout,
  params,
  devices,
  selectedId,
  onSelectSign,
}: {
  layout: RoadLayout
  params: Params
  devices: DeviceLayout
  selectedId: string | null
  onSelectSign: (spot: SignSpot) => void
}) {
  const { asphalt, grass } = useRoadTextures()
  const { cs } = layout
  const length = layout.totalLength
  const roadMid = (layout.roadZ0 + layout.roadZ1) / 2
  const asphaltRepeatVec = useMemo(() => asphaltRepeat(length, cs.ROAD_WIDTH), [cs.ROAD_WIDTH, length])

  useLayoutEffect(() => {
    asphalt.repeat.copy(asphaltRepeatVec)
    asphalt.needsUpdate = true
  }, [asphalt, asphaltRepeatVec])

  const upMarks = useLaneMarkingGeometry(layout, {
    outer: cs.UP.edgeOuter,
    split: cs.UP.laneSplit,
    inner: cs.UP.edgeInner,
  })
  const downMarks = useLaneMarkingGeometry(layout, {
    outer: cs.DOWN.edgeOuter,
    split: cs.DOWN.laneSplit,
    inner: cs.DOWN.edgeInner,
  })

  const primarySign: 1 | -1 = params.direction === 'up' ? -1 : 1
  const workMidZ = (layout.segments[3]!.z0 + layout.segments[3]!.z1) / 2
  const bandX = (sign: 1 | -1) => {
    const cw = sign === 1 ? cs.DOWN : cs.UP
    return params.doubleSide || params.workSide === 'median' ? cw.edgeInner : cw.edgeOuter
  }
  const bandW = layout.mode === 'schematic' ? 8 : 0.55
  const bands = [
    ...layout.segments.map((seg) => ({
      key: seg.key,
      sign: primarySign,
      z0: seg.z0,
      z1: seg.z1,
      color: seg.color,
    })),
    ...(params.doubleSide
      ? layout.segments.map((seg) => ({
          key: `${seg.key}-rot`,
          sign: (primarySign === 1 ? -1 : 1) as 1 | -1,
          z0: 2 * workMidZ - seg.z1,
          z1: 2 * workMidZ - seg.z0,
          color: seg.color,
        }))
      : []),
  ]

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.04, 0]} receiveShadow>
        <planeGeometry args={[40000, 40000]} />
        <meshStandardMaterial map={grass} color="#8f9a7c" roughness={1} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, cs.ROAD_Y, roadMid]} receiveShadow>
        <planeGeometry args={[cs.ROAD_WIDTH, length]} />
        <meshStandardMaterial map={asphalt} color="#8a8984" roughness={0.94} metalness={0.02} />
      </mesh>

      <mesh position={[0, cs.ROAD_Y + 0.005, roadMid]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[cs.MEDIAN, length]} />
        <meshStandardMaterial color="#7d866c" roughness={1} />
      </mesh>

      <mesh position={[0, cs.BARRIER_H / 2, roadMid]} castShadow receiveShadow>
        <boxGeometry args={[cs.BARRIER_W, cs.BARRIER_H, length]} />
        <meshStandardMaterial color="#c5c1b7" roughness={0.82} />
      </mesh>
      <mesh position={[0, cs.BARRIER_H + cs.BARRIER_W * 0.08, roadMid]}>
        <boxGeometry args={[cs.BARRIER_W * 1.08, cs.BARRIER_W * 0.16, length]} />
        <meshStandardMaterial color="#b7b3a8" roughness={0.7} />
      </mesh>

      <LaneMarks geometry={upMarks.white} color="#f4f1ea" />
      <LaneMarks geometry={upMarks.yellow} color="#e6c200" />
      <LaneMarks geometry={downMarks.white} color="#f4f1ea" />
      <LaneMarks geometry={downMarks.yellow} color="#e6c200" />

      {bands.map((band) => (
        <mesh
          key={band.key}
          position={[bandX(band.sign) + band.sign * bandW, cs.ROAD_Y + 0.05, (band.z0 + band.z1) / 2]}
        >
          <boxGeometry args={[bandW, layout.mode === 'schematic' ? 0.8 : 0.04, Math.max(0.2, Math.abs(band.z1 - band.z0) - 0.4)]} />
          <meshStandardMaterial
            color={band.color}
            roughness={0.55}
            emissive={band.color}
            emissiveIntensity={0.06}
          />
        </mesh>
      ))}

      <ClosedLanes lanes={devices.closedLanes} y={cs.ROAD_Y} />
      <WorkVehicles layout={layout} params={params} y={cs.ROAD_Y} />
      <Cones key={`${devices.cones.length}-${params.doubleSide}`} spots={devices.cones} size={layout.mode === 'schematic' ? 12 : 1} y={cs.ROAD_Y} />
      <Signs
        spots={devices.signs}
        selectedId={selectedId}
        onSelect={onSelectSign}
        schematic={layout.mode === 'schematic'}
        lane={cs.LANE}
      />
      <Traffic
        key={`${layout.mode}-${length}-${params.direction}-${params.workSide}-${params.doubleSide}`}
        layout={layout}
        params={params}
      />
      <DirectionChevrons z0={layout.roadZ0} z1={layout.roadZ1} cs={cs} />
    </group>
  )
}

function DirectionChevrons({ z0, z1, cs }: { z0: number; z1: number; cs: CrossSection }) {
  const a = z0 + cs.LANE * 0.4
  const b = z1 - cs.LANE * 0.4
  const step = Math.max(cs.LANE, (b - a) / 12)
  const zs: number[] = []
  for (let z = a; z <= b; z += step) zs.push(z)
  const s = cs.kind === 'diagram' ? 2.4 : 1
  return (
    <group>
      {zs.map((z) => (
        <group key={z}>
          <Chevron x={cs.UP.laneMid} z={z} yaw={0} y={cs.ROAD_Y} s={s} />
          <Chevron x={cs.DOWN.laneMid} z={z} yaw={Math.PI} y={cs.ROAD_Y} s={s} />
        </group>
      ))}
    </group>
  )
}

function Chevron({ x, z, yaw, y, s }: { x: number; z: number; yaw: number; y: number; s: number }) {
  return (
    <group position={[x, y + 0.03 * s, z]} rotation={[0, yaw, 0]} scale={s}>
      <mesh>
        <boxGeometry args={[0.28, 0.012, 3.2]} />
        <meshStandardMaterial color="#ece8e0" roughness={0.35} emissive="#ece8e0" emissiveIntensity={0.08} />
      </mesh>
      <mesh position={[0.42, 0, 0.95]} rotation={[0, 0.55, 0]}>
        <boxGeometry args={[0.24, 0.012, 1.5]} />
        <meshStandardMaterial color="#ece8e0" roughness={0.35} emissive="#ece8e0" emissiveIntensity={0.08} />
      </mesh>
      <mesh position={[-0.42, 0, 0.95]} rotation={[0, -0.55, 0]}>
        <boxGeometry args={[0.24, 0.012, 1.5]} />
        <meshStandardMaterial color="#ece8e0" roughness={0.35} emissive="#ece8e0" emissiveIntensity={0.08} />
      </mesh>
    </group>
  )
}


