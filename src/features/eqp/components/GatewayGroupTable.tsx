import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { EqpInfo } from '../types/eqp.types'

interface GatewayGroupTableProps {
  /** 표시할 그룹의 설비 목록 */
  eqpItems: EqpInfo[]
  /** 그룹명 (예: gateway_app1) */
  groupName: string
}

/**
 * gateway_app 그룹 선택 시 해당 그룹의 설비 목록을 다중 행 테이블로 표시합니다.
 *
 * 단건 설비 선택(EqpInfoTable)과 달리 runtimeState/modelInfo를 표시하지 않습니다.
 * 이유: 다건 조회 시 N+1 비용이 크므로 기본 설비 정보(enabled 포함)만 표시합니다.
 *
 * @param eqpItems 해당 그룹에 속한 설비 목록
 * @param groupName 그룹명 (헤더에 표시)
 */
export function GatewayGroupTable({ eqpItems, groupName }: GatewayGroupTableProps) {
  return (
    <section className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-[#E4EAE6] bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold text-[#213028]">{groupName}</h2>
        <span className="text-xs text-[#7A8680]">설비 {eqpItems.length}개</span>
      </div>

      <div className="overflow-auto">
        <Table className="min-w-[760px]">
          <TableHeader>
            <TableRow className="bg-[#F6F9F7]">
              <TableHead>EQPID</TableHead>
              <TableHead>Comm Interface</TableHead>
              <TableHead>Comm Mode</TableHead>
              <TableHead>Route Partition</TableHead>
              <TableHead>IP</TableHead>
              <TableHead>Port</TableHead>
              <TableHead>Enabled</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {eqpItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-sm text-[#647169]">
                  이 그룹에 속한 설비가 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              eqpItems.map((eqp) => (
                <TableRow key={eqp.eqpId}>
                  <TableCell>{eqp.eqpId}</TableCell>
                  <TableCell>
                    <Badge variant={eqp.commInterface === 'HSMS' ? 'info' : 'warning'}>
                      {eqp.commInterface}
                    </Badge>
                  </TableCell>
                  <TableCell>{eqp.commMode}</TableCell>
                  <TableCell>{eqp.routePartition ?? '—'}</TableCell>
                  <TableCell>{eqp.eqpIp}</TableCell>
                  <TableCell>{eqp.eqpPort}</TableCell>
                  <TableCell>
                    {/* runtimeState 없이 enabled 필드 기준만 표시 */}
                    <span
                      className={`inline-flex size-4 items-center justify-center rounded-full ${
                        eqp.enabled
                          ? 'bg-emerald-100/90 ring-2 ring-emerald-300/80'
                          : 'bg-slate-100 ring-2 ring-slate-300/80'
                      }`}
                      title={eqp.enabled ? '활성' : '비활성'}
                      aria-label={eqp.enabled ? '활성' : '비활성'}
                    >
                      <span
                        className={`inline-flex size-2 rounded-full ${
                          eqp.enabled
                            ? 'bg-gradient-to-br from-emerald-400 to-teal-500'
                            : 'bg-slate-500'
                        }`}
                      />
                    </span>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </section>
  )
}
