import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Tailwind 클래스를 조건부로 결합하고 충돌을 해결하는 유틸리티 함수
 * shadcn/ui 컴포넌트에서 사용
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
