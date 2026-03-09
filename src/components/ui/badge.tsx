import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-[#EDF4EF] text-[#215A43]',
        secondary: 'border-transparent bg-[#F2F4F3] text-[#5B6962]',
        outline: 'border-[#D2DDD7] bg-white text-[#33413A]',
        info: 'border-transparent bg-[#E8F0FA] text-[#2A5E9A]',
        warning: 'border-transparent bg-[#FFF3DF] text-[#A26A13]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

function Badge({ className, variant, ...props }: React.ComponentProps<'span'> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge }
