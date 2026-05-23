import type { PostgrestError } from '@supabase/supabase-js'

export function handleSupabaseError(error: PostgrestError | null): string | null {
  if (!error) return null
  switch (error.code) {
    case '23505':
      return 'A record with this date already exists.'
    case '23514':
      return 'Invalid leave request format.'
    case '42501':
      return 'You do not have permission to do this.'
    default:
      return error.message
  }
}

export function formatCurrency(amount: number, currency = 'INR'): string {
  if (currency === 'INR') {
    return `₹ ${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }
  return `${currency} ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}
