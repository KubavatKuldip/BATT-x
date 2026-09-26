import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatTemperature(celsius: number): string {
  return `${celsius.toFixed(1)}°C`
}

export function formatVoltage(volts: number): string {
  return `${volts.toFixed(2)}V`
}

export function formatCurrent(amps: number): string {
  return `${amps.toFixed(2)}A`
}

export function formatGasLevel(ppm: number): string {
  return `${ppm.toFixed(0)} ppm`
}

export function formatBatteryPercent(percent: number): string {
  return `${Math.round(percent)}%`
}

export function getStatusColor(status: 'normal' | 'warning' | 'cutoff'): string {
  switch (status) {
    case 'normal':
      return 'text-success'
    case 'warning':
      return 'text-warning'
    case 'cutoff':
      return 'text-danger'
    default:
      return 'text-muted-foreground'
  }
}

export function getStatusBgColor(status: 'normal' | 'warning' | 'cutoff'): string {
  switch (status) {
    case 'normal':
      return 'bg-success/10'
    case 'warning':
      return 'bg-warning/10'
    case 'cutoff':
      return 'bg-danger/10'
    default:
      return 'bg-muted'
  }
}

export function formatTimestamp(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
}

export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffSecs = Math.floor(diffMs / 1000)
  const diffMins = Math.floor(diffSecs / 60)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSecs < 60) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`

  return formatTimestamp(d)
}
