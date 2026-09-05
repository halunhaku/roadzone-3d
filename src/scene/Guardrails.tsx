import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { CrossSection } from '../layout/crossSection'

// 单侧波形梁护栏立柱与横梁
function WBeamSingle({
  x,
  y,
  length,
  roadMid,
  schematic,
  facing, // 1 或 -1，波形梁板朝向行车道
}: {
  x: number
  y: number
  length: number
  roadMid: number
  schematic: boolean
  facing: 1 | -1
}) {
  const postH = schematic ? 5.8 : 0.85
  const postR = schematic ? 0.42 : 0.06
  const postSpacing = schematic ? 18 : 4.0
  const count = Math.max(4, Math.round(length / postSpacing))

  const postMeshRef = useRef<THREE.InstancedMesh>(null)
  const postGeo = useMemo(() => new THREE.CylinderGeometry(postR, postR, postH, 8), [postR, postH])

  useLayoutEffect(() => {
    if (!postMeshRef.current) return
    const dummy = new THREE.Object3D()
    const step = length / count
    const zStart = roadMid - length / 2

    for (let i = 0; i <= count; i++) {
      const z = zStart + i * step
      dummy.position.set(x, y + postH / 2, z)
      dummy.updateMatrix()
      postMeshRef.current.setMatrixAt(i, dummy.matrix)
    }
    postMeshRef.current.instanceMatrix.needsUpdate = true
  }, [count, length, postH, roadMid, x, y])

  useLayoutEffect(() => {
    return () => {
      postGeo.dispose()
    }
  }, [postGeo])

  // 波形梁板高度与厚度
  const beamH = schematic ? 2.4 : 0.35
  const beamT = schematic ? 0.38 : 0.05
  const beamY = y + postH * 0.62
  const beamX = x + facing * (postR + beamT / 2)

  return (
    <group>
      {/* 钢立柱阵列 */}
      <instancedMesh
        ref={postMeshRef}
        args={[postGeo, undefined, count + 1]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color="#d4d4d8" roughness={0.4} metalness={0.4} />
      </instancedMesh>

      {/* 主波形梁连续钢护栏板 */}
      <mesh position={[beamX, beamY, roadMid]} castShadow receiveShadow>
        <boxGeometry args={[beamT, beamH, length]} />
        <meshStandardMaterial color="#e4e4e7" roughness={0.32} metalness={0.55} />
      </mesh>

      {/* 波形梁上下凸棱 (模拟双波波形截面层次) */}
      <mesh position={[beamX + facing * (beamT * 0.25), beamY + beamH * 0.32, roadMid]}>
        <boxGeometry args={[beamT * 0.45, beamH * 0.22, length]} />
        <meshStandardMaterial color="#f4f4f5" roughness={0.28} metalness={0.6} />
      </mesh>
      <mesh position={[beamX + facing * (beamT * 0.25), beamY - beamH * 0.32, roadMid]}>
        <boxGeometry args={[beamT * 0.45, beamH * 0.22, length]} />
        <meshStandardMaterial color="#f4f4f5" roughness={0.28} metalness={0.6} />
      </mesh>
    </group>
  )
}

// 中央分隔带双向波形护栏 + 绿色防眩板阵列
function MedianGuardrailAndGlareScreen({
  x = 0,
  y,
  length,
  roadMid,
  schematic,
}: {
  x?: number
  y: number
  length: number
  roadMid: number
  schematic: boolean
}) {
  const postH = schematic ? 6.2 : 0.95
  const postR = schematic ? 0.46 : 0.07
  const postSpacing = schematic ? 18 : 4.0
  const postCount = Math.max(4, Math.round(length / postSpacing))

  const postMeshRef = useRef<THREE.InstancedMesh>(null)
  const postGeo = useMemo(() => new THREE.CylinderGeometry(postR, postR, postH, 8), [postR, postH])

  useLayoutEffect(() => {
    if (!postMeshRef.current) return
    const dummy = new THREE.Object3D()
    const step = length / postCount
    const zStart = roadMid - length / 2

    for (let i = 0; i <= postCount; i++) {
      const z = zStart + i * step
      dummy.position.set(x, y + postH / 2, z)
      dummy.updateMatrix()
      postMeshRef.current.setMatrixAt(i, dummy.matrix)
    }
    postMeshRef.current.instanceMatrix.needsUpdate = true
  }, [postCount, length, postH, roadMid, x, y])

  useLayoutEffect(() => {
    return () => {
      postGeo.dispose()
    }
  }, [postGeo])

  // 双侧波形梁护栏板
  const beamH = schematic ? 2.4 : 0.35
  const beamT = schematic ? 0.36 : 0.05
  const beamY = y + postH * 0.58
  const offsetSide = postR + beamT / 2 + (schematic ? 0.3 : 0.04)

  // 防眩板参数
  const glareH = schematic ? 4.2 : 0.75
  const glareW = schematic ? 1.8 : 0.22
  const glareT = schematic ? 0.28 : 0.04
  const glareSpacing = schematic ? 7.5 : 1.2
  const glareCount = Math.max(10, Math.round(length / glareSpacing))
  const glareBaseY = y + postH + 0.1

  const glareMeshRef = useRef<THREE.InstancedMesh>(null)
  const glareGeo = useMemo(() => new THREE.BoxGeometry(glareW, glareH, glareT), [glareW, glareH, glareT])

  useLayoutEffect(() => {
    if (!glareMeshRef.current) return
    const dummy = new THREE.Object3D()
    const step = length / glareCount
    const zStart = roadMid - length / 2

    for (let i = 0; i <= glareCount; i++) {
      const z = zStart + i * step
      // 防眩板标准 8°~10° 遮光斜角
      dummy.position.set(x, glareBaseY + glareH / 2, z)
      dummy.rotation.set(0, 0.15, 0)
      dummy.updateMatrix()
      glareMeshRef.current.setMatrixAt(i, dummy.matrix)
    }
    glareMeshRef.current.instanceMatrix.needsUpdate = true
  }, [glareCount, glareBaseY, glareH, length, roadMid, x])

  useLayoutEffect(() => {
    return () => {
      glareGeo.dispose()
    }
  }, [glareGeo])

  return (
    <group>
      {/* 中分带中心立柱 */}
      <instancedMesh
        ref={postMeshRef}
        args={[postGeo, undefined, postCount + 1]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color="#d4d4d8" roughness={0.4} metalness={0.4} />
      </instancedMesh>

      {/* 左侧波形护栏板 */}
      <mesh position={[x - offsetSide, beamY, roadMid]} castShadow receiveShadow>
        <boxGeometry args={[beamT, beamH, length]} />
        <meshStandardMaterial color="#e4e4e7" roughness={0.32} metalness={0.55} />
      </mesh>

      {/* 右侧波形护栏板 */}
      <mesh position={[x + offsetSide, beamY, roadMid]} castShadow receiveShadow>
        <boxGeometry args={[beamT, beamH, length]} />
        <meshStandardMaterial color="#e4e4e7" roughness={0.32} metalness={0.55} />
      </mesh>

      {/* 防眩板承托固定横梁 */}
      <mesh position={[x, y + postH + 0.05, roadMid]}>
        <boxGeometry args={[schematic ? 0.8 : 0.12, schematic ? 0.35 : 0.06, length]} />
        <meshStandardMaterial color="#a1a1aa" roughness={0.5} metalness={0.3} />
      </mesh>

      {/* 高速公路标准绿色防眩板阵列 (InstancedMesh 高性能单批次渲染) */}
      <instancedMesh
        ref={glareMeshRef}
        args={[glareGeo, undefined, glareCount + 1]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial
          color="#15803d"
          roughness={0.55}
          metalness={0.08}
          emissive="#166534"
          emissiveIntensity={0.08}
        />
      </instancedMesh>
    </group>
  )
}

export function Guardrails({
  cs,
  length,
  roadMid,
}: {
  cs: CrossSection
  length: number
  roadMid: number
}) {
  const schematic = cs.kind === 'diagram'

  // 左侧路肩外侧护栏 (UP 方向车道外侧)
  // 右侧路肩外侧护栏 (DOWN 方向车道外侧)
  const leftX = cs.UP.outerShoulder.x0 + (schematic ? 1.6 : 0.25)
  const rightX = cs.DOWN.outerShoulder.x1 - (schematic ? 1.6 : 0.25)

  // 路基基准高程
  const roadY = cs.ROAD_Y
  const medianY = cs.ROAD_Y + 0.16 // 建立在已升起的中央绿化岛之上

  return (
    <group>
      {/* 1. 左侧路侧波形梁护栏 (面向路内) */}
      <WBeamSingle
        x={leftX}
        y={roadY}
        length={length}
        roadMid={roadMid}
        schematic={schematic}
        facing={1}
      />

      {/* 2. 右侧路侧波形梁护栏 (面向路内) */}
      <WBeamSingle
        x={rightX}
        y={roadY}
        length={length}
        roadMid={roadMid}
        schematic={schematic}
        facing={-1}
      />

      {/* 3. 中央分隔带双向波形护栏 + 标准绿色防眩板系统 */}
      <MedianGuardrailAndGlareScreen
        x={0}
        y={medianY}
        length={length}
        roadMid={roadMid}
        schematic={schematic}
      />
    </group>
  )
}
