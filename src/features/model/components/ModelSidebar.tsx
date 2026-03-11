import { ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { ModelInfo, ProtocolType } from '../types/model.types'

interface ModelSidebarProps {
  modelItems: ModelInfo[]
  selectedModelVersionKey: number | null
  sidebarOpen: boolean
  isLoading: boolean
  errorMessage: string | null
  onSelectModel: (model: ModelInfo) => void
  onToggleSidebar: () => void
}

interface SidebarGroups {
  secsModels: ModelInfo[]
  socketModels: ModelInfo[]
}

/**
 * 모델명을 숫자 인식 오름차순으로 비교합니다. (예: model1, model2, ..., model10)
 */
const compareModelNameAsc = (firstItem: ModelInfo, secondItem: ModelInfo): number =>
  firstItem.modelName.localeCompare(secondItem.modelName, 'ko-KR', {
    numeric: true,
    sensitivity: 'base',
  })

/**
 * commInterface를 Sidebar 루트 노드(SECS/Socket) 그룹으로 변환합니다.
 */
const resolveInterfaceGroup = (commInterface: ProtocolType): 'SECS' | 'Socket' => {
  const normalizedInterface = commInterface.toUpperCase()
  return normalizedInterface === 'SOCKET' ? 'Socket' : 'SECS'
}

/**
 * 최신 업데이트 순서를 기준으로 모델명 단위 대표 항목을 추출합니다.
 * 같은 model_name의 여러 버전 중 최신(updatedAt 내림차순) 1건만 Sidebar에 노출합니다.
 */
const buildSidebarGroups = (modelItems: ModelInfo[], searchKeyword: string): SidebarGroups => {
  const normalizedKeyword = searchKeyword.trim().toLowerCase()

  const sortedItems = [...modelItems].sort((firstItem, secondItem) => {
    const secondTime = Date.parse(secondItem.updatedAt)
    const firstTime = Date.parse(firstItem.updatedAt)
    return secondTime - firstTime
  })

  const representativeByGroupAndName = new Map<string, ModelInfo>()

  sortedItems.forEach((item) => {
    if (
      normalizedKeyword &&
      !item.modelName.toLowerCase().includes(normalizedKeyword) &&
      !item.modelVersion.toLowerCase().includes(normalizedKeyword)
    ) {
      return
    }

    const group = resolveInterfaceGroup(item.commInterface)
    const groupKey = `${group}:${item.modelName}`

    if (!representativeByGroupAndName.has(groupKey)) {
      representativeByGroupAndName.set(groupKey, item)
    }
  })

  const secsModels: ModelInfo[] = []
  const socketModels: ModelInfo[] = []

  representativeByGroupAndName.forEach((item) => {
    if (resolveInterfaceGroup(item.commInterface) === 'Socket') {
      socketModels.push(item)
      return
    }
    secsModels.push(item)
  })

  secsModels.sort(compareModelNameAsc)
  socketModels.sort(compareModelNameAsc)

  return { secsModels, socketModels }
}

/**
 * Model 페이지 좌측 Sidebar 컴포넌트입니다.
 * - 루트 노드: SECS, Socket
 * - 하위 노드: model_name(버전은 Sidebar에 노출하지 않음)
 */
export function ModelSidebar({
  modelItems,
  selectedModelVersionKey,
  sidebarOpen,
  isLoading,
  errorMessage,
  onSelectModel,
  onToggleSidebar,
}: ModelSidebarProps) {
  const [searchKeyword, setSearchKeyword] = useState('')

  const selectedModel = useMemo(
    () => modelItems.find((item) => item.modelVersionKey === selectedModelVersionKey) ?? null,
    [modelItems, selectedModelVersionKey],
  )

  const { secsModels, socketModels } = useMemo(
    () => buildSidebarGroups(modelItems, searchKeyword),
    [modelItems, searchKeyword],
  )

  if (!sidebarOpen) {
    return (
      <aside className="flex w-14 flex-col self-stretch border-r border-[#E4EAE6] bg-white">
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
      </aside>
    )
  }

  return (
    <aside className="flex w-60 flex-col self-stretch border-r border-[#E4EAE6] bg-white">
      <div className="flex h-[52px] items-center justify-between border-b border-[#E4EAE6] px-3">
        <span className="text-sm font-semibold text-[#243129]">Model Info</span>
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
            placeholder="Model 검색"
            className="h-9 bg-[#F7FAF8] pl-8 text-xs"
          />
        </div>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto px-2 pb-3">
        <section className="rounded-lg border border-[#DDE8E1] bg-[#FAFCFB] p-2">
          <div className="mb-1 text-xs font-semibold text-[#315343]">SECS</div>
          <div className="space-y-1 pl-2">
            {secsModels.length === 0 ? (
              <p className="py-1 text-[11px] text-[#97A39C]">표시할 모델이 없습니다.</p>
            ) : (
              secsModels.map((model) => {
                const isSelected = selectedModel?.modelName === model.modelName
                return (
                  <button
                    key={`secs-${model.modelName}`}
                    type="button"
                    onClick={() => onSelectModel(model)}
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
                    <span>{model.modelName}</span>
                  </button>
                )
              })
            )}
          </div>
        </section>

        <section className="rounded-lg border border-[#DDE8E1] bg-[#FAFCFB] p-2">
          <div className="mb-1 text-xs font-semibold text-[#315343]">Socket</div>
          <div className="space-y-1 pl-2">
            {socketModels.length === 0 ? (
              <p className="py-1 text-[11px] text-[#97A39C]">표시할 모델이 없습니다.</p>
            ) : (
              socketModels.map((model) => {
                const isSelected = selectedModel?.modelName === model.modelName
                return (
                  <button
                    key={`socket-${model.modelName}`}
                    type="button"
                    onClick={() => onSelectModel(model)}
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
                    <span>{model.modelName}</span>
                  </button>
                )
              })
            )}
          </div>
        </section>

        {isLoading ? <p className="px-2 text-xs text-[#6D7972]">모델 목록을 불러오는 중입니다.</p> : null}
        {errorMessage ? <p className="px-2 text-xs text-[#C5534B]">{errorMessage}</p> : null}
      </div>
    </aside>
  )
}
