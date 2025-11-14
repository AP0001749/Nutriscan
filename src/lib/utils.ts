import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
  }).format(price)
}

export function formatNutrientValue(value: number, unit: string): string {
  if (value < 1 && unit !== 'kcal') {
    return `${(value * 1000).toFixed(1)}m${unit}`
  }
  return `${value.toFixed(1)}${unit}`
}
