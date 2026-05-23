import type { LeaveStatus } from '../../types/database.types'

const config: Record<LeaveStatus, { label: string; className: string }> = {
  pending: { label: 'Pending', className: 'badge badge-pending' },
  approved: { label: 'Approved', className: 'badge badge-approved' },
  rejected: { label: 'Rejected', className: 'badge badge-rejected' },
}

export function StatusBadge({ status }: { status: LeaveStatus }) {
  const { label, className } = config[status]
  return <span className={className}>{label}</span>
}
