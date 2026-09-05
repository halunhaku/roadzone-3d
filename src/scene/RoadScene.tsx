import { OrbitControls } from '@react-three/drei'
import { Canvas, useThree } from '@react-three/fiber'
import { useEffect, useLayoutEffect, type MutableRefObject } from 'react'
import * as THREE from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { roadsideEyeX, roadsideLookX } from '../layout/cameraPath'
import type { RoadLayout } from '../layout/buildLayout'

import type { DeviceLayout, SignSpot } from '../layout/devices'
import { canvasToPng } from '../ui/exportPng'
import type { Params } from '../zone/types'
import { Roadway } from './Roadway'

export type CaptureFn = () => Promise<Blob>

export type CameraApi = {
  rotate: (azimDelta: number) => void
  zoom: (factor: number) => void
  reset: () => void
}

function FitOrbit({
  roadZ0,
  roadZ1,
  eyeX,
  lookX,
  cameraRef,
}: {
  roadZ0: number
  roadZ1: number
  eyeX: number
  lookX: number
  cameraRef?: MutableRefObject<CameraApi | null>
}) {
  const camera = useThree((s) => s.camera)
  const controls = useThree((s) => s.controls) as OrbitControlsImpl | null

  useEffect(() => {
    const applyDefault = () => {
      const span = Math.max(80, roadZ1 - roadZ0)
      const midZ = (roadZ0 + roadZ1) / 2
      const side = eyeX === 0 ? -1 : Math.sign(eyeX)
      const aspect = (camera as THREE.PerspectiveCamera).aspect || 1
      if (aspect < 1) {
        const aspectComp = Math.max(0.4, aspect)
        camera.position.set(
          side * (Math.abs(eyeX) + (span * 0.18) / aspectComp),
          Math.max(120, (span * 0.42) / Math.sqrt(aspectComp)),
          roadZ0 - (span * 0.24) / aspectComp,
        )
      } else {
        camera.position.set(side * (Math.abs(eyeX) + span * 0.15), Math.max(110, span * 0.38), roadZ0 - span * 0.18)
      }
      camera.near = 8
      camera.far = Math.max(3000, span * 6)
      camera.updateProjectionMatrix()
      if (!controls) return
      controls.target.set(lookX - side * span * 0.05, 6, midZ)
      controls.update()
      const dist = camera.position.distanceTo(controls.target)
      const polar = controls.getPolarAngle()
      const azim = controls.getAzimuthalAngle()
      controls.minDistance = dist * 0.48
      controls.maxDistance = dist * 1.9
      controls.minPolarAngle = Math.max(0.22, polar - 0.4)
      controls.maxPolarAngle = Math.min(Math.PI / 2 - 0.12, polar + 0.32)
      controls.minAzimuthAngle = azim - 0.95
      controls.maxAzimuthAngle = azim + 0.95
      controls.enablePan = false
      controls.update()
    }
    applyDefault()
    if (!cameraRef) return
    cameraRef.current = {
      reset: applyDefault,
      rotate(azimDelta) {
        if (!controls) return
        const offset = camera.position.clone().sub(controls.target)
        const spherical = new THREE.Spherical().setFromVector3(offset)
        spherical.theta = Math.min(controls.maxAzimuthAngle, Math.max(controls.minAzimuthAngle, spherical.theta + azimDelta))
        spherical.makeSafe()
        offset.setFromSpherical(spherical)
        camera.position.copy(controls.target).add(offset)
        controls.update()
      },
      zoom(factor) {
        if (!controls) return
        const dist = camera.position.distanceTo(controls.target)
        const next = Math.min(controls.maxDistance, Math.max(controls.minDistance, dist * factor))
        const offset = camera.position.clone().sub(controls.target).setLength(next)
        camera.position.copy(controls.target).add(offset)
        controls.update()
      },
    }
    return () => {
      cameraRef.current = null
    }
  }, [camera, cameraRef, controls, eyeX, lookX, roadZ0, roadZ1])

  return null
}

function Lights({ length }: { length: number }) {
  const shadowSpanX = 220
  const shadowSpanZ = Math.max(500, length * 0.75)
  return (
    <>
      <hemisphereLight args={['#ffffff', '#82957b', 0.92]} />
      <directionalLight
        castShadow
        position={[length * 0.24, 115, length * 0.15]}
        intensity={1.85}
        color="#fffbf2"
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={10}
        shadow-camera-far={Math.max(500, length * 2.5)}
        shadow-camera-left={-shadowSpanX}
        shadow-camera-right={shadowSpanX}
        shadow-camera-top={shadowSpanZ}
        shadow-camera-bottom={-shadowSpanZ}
        shadow-bias={-0.0003}
        shadow-normalBias={0.04}
      />
      <ambientLight intensity={0.42} color="#fffcf5" />
    </>
  )
}

function CaptureBridge({ captureRef }: { captureRef?: MutableRefObject<CaptureFn | null> }) {
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)
  const camera = useThree((s) => s.camera)

  useLayoutEffect(() => {
    if (!captureRef) return
    captureRef.current = async () => {
      gl.render(scene, camera)
      return canvasToPng(gl.domElement)
    }
    return () => {
      captureRef.current = null
    }
  }, [camera, captureRef, gl, scene])

  return null
}

export function RoadScene({
  layout,
  params,
  devices,
  selectedId,
  onSelectSign,
  onMiss,
  captureRef,
  cameraRef,
}: {
  layout: RoadLayout
  params: Params
  devices: DeviceLayout
  selectedId: string | null
  onSelectSign: (spot: SignSpot) => void
  onMiss: () => void
  captureRef?: MutableRefObject<CaptureFn | null>
  cameraRef?: MutableRefObject<CameraApi | null>
}) {
  const fogFar = Math.max(3000, layout.totalLength * 5)
  const fogNear = 1800
  const bg = '#f6f4ee'

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: false, preserveDrawingBuffer: true, logarithmicDepthBuffer: true }}
      camera={{ fov: 32, near: 8, far: 4000, position: [130, 105, 170] }}
      onPointerMissed={onMiss}
      onCreated={({ gl }) => {
        gl.setClearColor(bg)
      }}
    >
      <fog attach="fog" args={[bg, fogNear, fogFar]} />
      <CaptureBridge captureRef={captureRef} />
      <Lights length={layout.totalLength} />
      <Roadway
        layout={layout}
        params={params}
        devices={devices}
        selectedId={selectedId}
        onSelectSign={onSelectSign}
      />
      <OrbitControls
        makeDefault
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.28}
        zoomSpeed={0.38}
        target={[0, 0, 0]}
      />
      <FitOrbit
        roadZ0={layout.roadZ0}
        roadZ1={layout.roadZ1}
        eyeX={roadsideEyeX(params, layout.cs)}
        lookX={roadsideLookX(params, layout.cs)}
        cameraRef={cameraRef}
      />
    </Canvas>
  )
}
