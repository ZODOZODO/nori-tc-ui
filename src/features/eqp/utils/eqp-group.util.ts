import type { EqpInfo, GatewayAppGroup } from '../types/eqp.types'

/**
 * EQP 목록을 route_partition 기준으로 gateway_app 그룹과 미할당 항목으로 분류합니다.
 *
 * 그룹화 규칙: route_partition 2개씩 묶어 gateway_app{N} 그룹 구성
 * 예: [0,1] → gateway_app1, [2,3] → gateway_app2, [4,5] → gateway_app3
 *
 * route_partition이 null이거나 0 미만이면 unassigned로 분류합니다.
 *
 * @param eqpItems 그룹화할 EQP 목록
 * @returns gatewayGroups(그룹 목록), unassignedEqpItems(미할당 목록)
 */
export function groupEqpItems(eqpItems: EqpInfo[]): {
  gatewayGroups: GatewayAppGroup[]
  unassignedEqpItems: EqpInfo[]
} {
  const groupedByApp = new Map<number, EqpInfo[]>()
  const unassigned: EqpInfo[] = []

  eqpItems.forEach((eqp) => {
    const partition = eqp.routePartition
    if (typeof partition !== 'number' || partition < 0) {
      unassigned.push(eqp)
      return
    }

    const appIndex = Math.floor(partition / 2) + 1
    const currentGroup = groupedByApp.get(appIndex) ?? []
    currentGroup.push(eqp)
    groupedByApp.set(appIndex, currentGroup)
  })

  const gatewayGroups: GatewayAppGroup[] = Array.from(groupedByApp.entries())
    .sort((left, right) => left[0] - right[0])
    .map(([appIndex, items]) => ({
      appIndex,
      appName: `gateway_app${appIndex}`,
      items: [...items].sort((left, right) => {
        const leftPartition = left.routePartition ?? Number.MAX_SAFE_INTEGER
        const rightPartition = right.routePartition ?? Number.MAX_SAFE_INTEGER
        if (leftPartition !== rightPartition) {
          return leftPartition - rightPartition
        }
        return left.eqpId.localeCompare(right.eqpId)
      }),
    }))

  return {
    gatewayGroups,
    unassignedEqpItems: [...unassigned].sort((left, right) =>
      left.eqpId.localeCompare(right.eqpId),
    ),
  }
}
