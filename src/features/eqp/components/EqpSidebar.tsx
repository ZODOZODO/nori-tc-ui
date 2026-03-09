import { Building2, ChevronLeft, ChevronRight, Search, Server } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { EqpInfo } from '../types/eqp.types'
import { useMemo, useState } from 'react'

interface EqpSidebarProps {
  eqpItems: EqpInfo[]
  selectedEqpId: string | null
  sidebarOpen: boolean
  isLoading: boolean
  errorMessage: string | null
  onSelectEqp: (eqpId: string) => void
  onToggleSidebar: () => void
}

interface GatewayAppGroup {
  appIndex: number
  appName: string
  items: EqpInfo[]
}

/**
 * design.pen의 EqpSidebarExpanded/Collapsed 구조를 기반으로 만든 사이드바입니다.
 * 실제 EQP 데이터는 useEqpList 결과를 사용하고, 검색은 eqpId 기준으로 필터링합니다.
 */
export function EqpSidebar({
  eqpItems,
  selectedEqpId,
  sidebarOpen,
  isLoading,
  errorMessage,
  onSelectEqp,
  onToggleSidebar,
}: EqpSidebarProps) {
  const [searchKeyword, setSearchKeyword] = useState('')

  const filteredEqpItems = useMemo(() => {
    const normalizedKeyword = searchKeyword.trim().toLowerCase()

    if (!normalizedKeyword) {
      return eqpItems
    }

    return eqpItems.filter((eqp) => eqp.eqpId.toLowerCase().includes(normalizedKeyword))
  }, [eqpItems, searchKeyword])

  /**
   * route_partition을 2개씩 묶어 gateway_app{N} 그룹으로 분류합니다.
   * 예: [0,1] -> gateway_app1, [2,3] -> gateway_app2, [4,5] -> gateway_app3
   */
  const { gatewayGroups, unassignedEqpItems } = useMemo(() => {
    const groupedByApp = new Map<number, EqpInfo[]>()
    const unassigned: EqpInfo[] = []

    filteredEqpItems.forEach((eqp) => {
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

    const gatewayAppGroups: GatewayAppGroup[] = Array.from(groupedByApp.entries())
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
      gatewayGroups: gatewayAppGroups,
      unassignedEqpItems: [...unassigned].sort((left, right) => left.eqpId.localeCompare(right.eqpId)),
    }
  }, [filteredEqpItems])

  if (!sidebarOpen) {
    return (
      <aside className="flex h-full w-14 flex-col border-r border-[#E4EAE6] bg-white">
        <div className="flex h-[52px] items-center justify-center border-b border-[#E4EAE6]">
          <button
            type="button"
            onClick={onToggleSidebar}
            className="flex size-8 items-center justify-center rounded-md border border-[#D8E1DB] text-[#516058] hover:bg-[#F2F7F3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1C7F59]/30"
            aria-label="사이드바 펼치기"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>

        <div className="flex flex-1 flex-col items-center gap-2 overflow-y-auto py-3">
          {filteredEqpItems.map((eqp) => {
            const isSelected = selectedEqpId === eqp.eqpId
            return (
              <button
                key={eqp.eqpId}
                type="button"
                title={eqp.eqpId}
                onClick={() => onSelectEqp(eqp.eqpId)}
                className={cn(
                  'flex h-7 w-10 items-center justify-center rounded-md text-[10px] font-semibold tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1C7F59]/30',
                  isSelected ? 'bg-[#EAF5EE] text-[#1F2D26]' : 'text-[#6E7B74] hover:bg-[#F3F7F4]',
                )}
              >
                {eqp.eqpId.slice(-3)}
              </button>
            )
          })}
        </div>
      </aside>
    )
  }

  return (
    <aside className="flex h-full w-60 flex-col border-r border-[#E4EAE6] bg-white">
      <div className="flex h-[52px] items-center justify-between border-b border-[#E4EAE6] px-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-[#243129]">▾ 설비 목록</span>
        </div>
        <button
          type="button"
          onClick={onToggleSidebar}
          className="flex size-8 items-center justify-center rounded-md border border-[#D8E1DB] text-[#516058] hover:bg-[#F2F7F3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1C7F59]/30"
          aria-label="사이드바 축소"
        >
          <ChevronLeft className="size-4" />
        </button>
      </div>

      <div className="px-3 py-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-[#9AA49E]" />
          <Input
            value={searchKeyword}
            onChange={(event) => setSearchKeyword(event.target.value)}
            placeholder="EQP ID 검색"
            className="h-9 bg-[#F7FAF8] pl-8 text-xs"
          />
        </div>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto px-2 pb-3">
        <div className="rounded-lg border border-[#E8EFEA] bg-[#FBFCFB] p-2">
          <div className="mb-1 flex items-center gap-2 text-xs font-semibold text-[#5E6A64]">
            <Building2 className="size-3.5 text-[#8FA396]" />
            <span>Business</span>
            <span className="ml-auto inline-block size-2 rounded-full bg-[#8FA396]" />
          </div>
          <p className="pl-5 text-[11px] text-[#97A39C]">연결된 EQP 없음</p>
        </div>

        <div className="rounded-lg border border-[#DDE8E1] bg-[#FAFCFB] p-2">
          <div className="mb-1 flex items-center gap-2 text-xs font-semibold text-[#315343]">
            <Server className="size-3.5 text-[#2AAE67]" />
            <span>Gateway</span>
            <span className="ml-auto inline-block size-2 rounded-full bg-[#2AAE67]" />
          </div>

          {gatewayGroups.map((group) => (
            <div key={group.appName} className="mt-2 space-y-1 pl-3 first:mt-0">
              <div className="text-[11px] font-medium text-[#5D6B65]">{group.appName}</div>
              <div className="space-y-1 pl-3">
                {group.items.map((eqp) => {
                  const isSelected = selectedEqpId === eqp.eqpId
                  return (
                    <button
                      key={`${group.appIndex}-${eqp.eqpId}`}
                      type="button"
                      onClick={() => onSelectEqp(eqp.eqpId)}
                      className={cn(
                        'flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1C7F59]/30',
                        isSelected
                          ? 'bg-[#EAF5EE] font-bold text-[#1F2D26]'
                          : 'text-[#51605A] hover:bg-[#F1F6F3]',
                      )}
                    >
                      <span
                        className={cn(
                          'inline-block size-1.5 rounded-full',
                          isSelected ? 'bg-[#2AAE67]' : 'bg-[#9AACA2]',
                        )}
                      />
                      <span>{eqp.eqpId}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}

          {unassignedEqpItems.length > 0 ? (
            <div className="mt-2 space-y-1 pl-3">
              <div className="text-[11px] font-medium text-[#5D6B65]">gateway_unassigned</div>
              <div className="space-y-1 pl-3">
                {unassignedEqpItems.map((eqp) => {
                  const isSelected = selectedEqpId === eqp.eqpId
                  return (
                    <button
                      key={`unassigned-${eqp.eqpId}`}
                      type="button"
                      onClick={() => onSelectEqp(eqp.eqpId)}
                      className={cn(
                        'flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1C7F59]/30',
                        isSelected
                          ? 'bg-[#EAF5EE] font-bold text-[#1F2D26]'
                          : 'text-[#51605A] hover:bg-[#F1F6F3]',
                      )}
                    >
                      <span
                        className={cn(
                          'inline-block size-1.5 rounded-full',
                          isSelected ? 'bg-[#2AAE67]' : 'bg-[#9AACA2]',
                        )}
                      />
                      <span>{eqp.eqpId}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          ) : null}
        </div>

        {isLoading ? <p className="px-2 text-xs text-[#6D7972]">설비 목록을 불러오는 중입니다.</p> : null}
        {errorMessage ? <p className="px-2 text-xs text-[#C5534B]">{errorMessage}</p> : null}
      </div>
    </aside>
  )
}
