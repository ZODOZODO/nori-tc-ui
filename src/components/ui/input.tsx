import * as React from 'react'
import { cn } from '@/lib/utils'

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'flex h-11 w-full min-w-0 rounded-xl border border-[#D8E1DB] bg-white px-3 text-sm text-[#243129] transition-[color,box-shadow] outline-none placeholder:text-[#93A19A] focus-visible:border-[#1C7F59] focus-visible:ring-[3px] focus-visible:ring-[#1C7F59]/20 disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  )
}

export { Input }
