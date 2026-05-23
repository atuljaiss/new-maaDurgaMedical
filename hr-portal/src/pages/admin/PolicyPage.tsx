import { useState, useEffect, type FormEvent } from 'react'
import { useLeavePolicy } from '../../hooks/useLeavePolicy'
import { supabase } from '../../lib/supabaseClient'
import { useQueryClient } from '@tanstack/react-query'
import type { Database } from '../../types/database.types'

const WEEKDAYS = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
]

export function AdminPolicyPage() {
  const { data: policy, isLoading } = useLeavePolicy()
  const queryClient = useQueryClient()

  const [monthlyDays, setMonthlyDays] = useState('4.0')
  const [yearlyDays, setYearlyDays] = useState('24.0')
  const [calendarMode, setCalendarMode] = useState<'all_days' | 'working_days'>('working_days')
  const [workingDays, setWorkingDays] = useState<number[]>([1, 2, 3, 4, 5, 6])
  const [currency, setCurrency] = useState('INR')
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (policy) {
      setMonthlyDays(String(policy.allowed_monthly_days))
      setYearlyDays(String(policy.allowed_yearly_days))
      setCalendarMode(policy.calendar_mode)
      setWorkingDays(policy.working_days)
      setCurrency(policy.currency)
    }
  }, [policy])

  const toggleDay = (day: number) => {
    setWorkingDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    )
  }

  const handleSave = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setSaving(true)

    const updateData: Database['public']['Tables']['leave_policy']['Update'] = {
      allowed_monthly_days: parseFloat(monthlyDays),
      allowed_yearly_days: parseFloat(yearlyDays),
      calendar_mode: calendarMode,
      working_days: workingDays,
      currency,
    }

    const { error: updateError } = await supabase
      .from('leave_policy')
      .update(updateData)
      .eq('id', 1)

    setSaving(false)

    if (updateError) {
      setError(updateError.message)
    } else {
      setSuccess('✓ Policy updated.')
      queryClient.invalidateQueries({ queryKey: ['leave_policy'] })
      setTimeout(() => setSuccess(''), 3000)
    }
  }

  if (isLoading) {
    return <div className="spinner" />
  }

  return (
    <div className="card" style={{ maxWidth: '600px' }} id="policy-form">
      <h2 className="section-heading mb-6">Leave Policy Settings</h2>

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div className="form-group">
          <label className="form-label" htmlFor="monthly-days">Monthly Allowed Days</label>
          <div className="flex items-center gap-2">
            <input
              id="monthly-days"
              type="number"
              className="form-input"
              value={monthlyDays}
              onChange={(e) => setMonthlyDays(e.target.value)}
              step="0.5"
              min="0"
              style={{ maxWidth: '120px' }}
            />
            <span className="text-secondary">days</span>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="yearly-days">Yearly Allowed Days (informational)</label>
          <div className="flex items-center gap-2">
            <input
              id="yearly-days"
              type="number"
              className="form-input"
              value={yearlyDays}
              onChange={(e) => setYearlyDays(e.target.value)}
              step="0.5"
              min="0"
              style={{ maxWidth: '120px' }}
            />
            <span className="text-secondary">days</span>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Count leave using</label>
          <div className="radio-group">
            <label className="radio-label">
              <input
                type="radio"
                name="calendarMode"
                value="all_days"
                checked={calendarMode === 'all_days'}
                onChange={() => setCalendarMode('all_days')}
              />
              All calendar days
            </label>
            <label className="radio-label">
              <input
                type="radio"
                name="calendarMode"
                value="working_days"
                checked={calendarMode === 'working_days'}
                onChange={() => setCalendarMode('working_days')}
              />
              Working days only
            </label>
          </div>
        </div>

        {calendarMode === 'working_days' && (
          <div className="form-group">
            <label className="form-label">Working Days</label>
            <div className="checkbox-group">
              {WEEKDAYS.map(({ value, label }) => (
                <label key={value} className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={workingDays.includes(value)}
                    onChange={() => toggleDay(value)}
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="form-group">
          <label className="form-label" htmlFor="currency">Currency</label>
          <input
            id="currency"
            type="text"
            className="form-input"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            style={{ maxWidth: '120px' }}
          />
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <button
          type="submit"
          className="btn btn-primary"
          disabled={saving}
          id="btn-save-policy"
          style={{ alignSelf: 'flex-end' }}
        >
          {saving ? 'Saving…' : 'Save Policy'}
        </button>
      </form>
    </div>
  )
}
