import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { EqpParamRow } from '../types/eqp.types'

interface EqpParamTableProps {
  rows: EqpParamRow[]
  isEditMode: boolean
  onChangeValue: (paramName: string, nextValue: string) => void
}

/**
 * EQP Parameter 테이블입니다.
 * 편집 모드에서는 Param Value를 인라인 Input으로 수정할 수 있습니다.
 */
export function EqpParamTable({
  rows,
  isEditMode,
  onChangeValue,
}: EqpParamTableProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-[#213028]">설비 파라미터</h2>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[#DCE5DB]">
        <Table className="min-w-[740px]">
          <TableHeader>
            <TableRow className="bg-[#66706B] [&>th]:text-[#F5F7F4]">
              <TableHead>Param Name</TableHead>
              <TableHead>Param Value</TableHead>
              <TableHead>Description</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="py-10 text-center text-sm text-[#647169]">
                  설정된 파라미터가 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.paramName}>
                  <TableCell className="font-medium">{row.paramName}</TableCell>
                  <TableCell>
                    {isEditMode ? (
                      <Input
                        value={row.paramValue}
                        onChange={(event) => onChangeValue(row.paramName, event.target.value)}
                        className="h-8"
                      />
                    ) : (
                      row.paramValue
                    )}
                  </TableCell>
                  <TableCell>{row.description}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
