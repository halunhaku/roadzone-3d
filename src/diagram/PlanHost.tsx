import type { RefObject } from 'react'
import { ZoneDiagrams } from './RoadDiagram'
import type { Params } from '../zone/types'
import type { RoadLayout } from '../layout/buildLayout'

export function PlanHost({
  params,
  layout,
  hostRef,
}: {
  params: Params
  layout: RoadLayout
  hostRef: RefObject<HTMLDivElement | null>
}) {
  return (
    <div ref={hostRef} className="plan-export-host" aria-hidden>
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
  )
}
