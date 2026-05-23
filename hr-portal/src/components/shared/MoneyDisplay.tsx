import { formatCurrency } from '../../lib/utils'

interface MoneyDisplayProps {
  amount: number
  currency?: string
  danger?: boolean
  className?: string
}

export function MoneyDisplay({ amount, currency = 'INR', danger, className = '' }: MoneyDisplayProps) {
  return (
    <span className={`money${danger ? ' money-danger' : ''} ${className}`}>
      {formatCurrency(amount, currency)}
    </span>
  )
}
