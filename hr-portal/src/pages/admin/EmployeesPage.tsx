import { useState, type FormEvent } from 'react'
import { format } from 'date-fns'
import { Users, X, Plus } from 'lucide-react'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { supabase } from '../../lib/supabaseClient'
import { useAddSalary } from '../../hooks/useSalaryHistory'
import { useCreateEmployee, useUpdateEmployeeProfile } from '../../hooks/useEmployees'
import { FileText, Trash2 } from 'lucide-react'
import { MoneyDisplay } from '../../components/shared/MoneyDisplay'
import { SkeletonTable } from '../../components/shared/SkeletonTable'
import { EmptyState } from '../../components/shared/EmptyState'
import { getInitials } from '../../lib/utils'
import type { Profile, Database } from '../../types/database.types'

type EmployeeRow = Profile & {
  current_salary?: number | null
  salary_effective?: string | null
}

export function AdminEmployeesPage() {
  const queryClient = useQueryClient()
  const createEmployee = useCreateEmployee()
  const updateProfile = useUpdateEmployeeProfile()
  const addSalary = useAddSalary()

  const { data: employees, isLoading } = useQuery<EmployeeRow[]>({
    queryKey: ['admin_employees'],
    queryFn: async () => {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'employee')
        .order('full_name')

      if (error) throw error

      const result: EmployeeRow[] = []
      for (const p of profiles ?? []) {
        const { data: salaries } = await supabase
          .from('salary_history')
          .select('amount, effective_from')
          .eq('user_id', p.user_id)
          .order('effective_from', { ascending: false })
          .limit(1)

        const salary = salaries?.[0]

        result.push({
          ...p,
          current_salary: salary?.amount ?? null,
          salary_effective: salary?.effective_from ?? null,
        })
      }

      return result
    },
    staleTime: 30_000,
  })

  const toggleActive = useMutation({
    mutationFn: async ({ userId, isActive }: { userId: string; isActive: boolean }) => {
      const updateData: Database['public']['Tables']['profiles']['Update'] = { is_active: isActive }
      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('user_id', userId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_employees'] })
    },
  })

  // Edit Salary Panel State
  const [editUserId, setEditUserId] = useState<string | null>(null)
  const [editUserName, setEditUserName] = useState('')
  const [salaryAmount, setSalaryAmount] = useState('')
  const [effectiveFrom, setEffectiveFrom] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [panelError, setPanelError] = useState('')

  // Add Employee Modal State
  const [showAddModal, setShowAddModal] = useState(false)
  const [addForm, setAddForm] = useState({
    fullName: '',
    email: '',
    password: '',
    mobileNumber: '',
  })
  const [aadharFile, setAadharFile] = useState<File | null>(null)
  const [otherDocs, setOtherDocs] = useState<FileList | null>(null)
  const [addError, setAddError] = useState('')
  const [isAdding, setIsAdding] = useState(false)

  // Edit Profile Panel State
  const [editProfileId, setEditProfileId] = useState<string | null>(null)
  const [editProfileForm, setEditProfileForm] = useState({
    fullName: '',
    employeeCode: '',
    mobileNumber: '',
  })
  const [currentAadharUrl, setCurrentAadharUrl] = useState<string | null>(null)
  const [currentOtherDocs, setCurrentOtherDocs] = useState<string[]>([])
  
  const [newAadharFile, setNewAadharFile] = useState<File | null>(null)
  const [newOtherDocs, setNewOtherDocs] = useState<FileList | null>(null)
  const [editProfileError, setEditProfileError] = useState('')
  const [isSavingProfile, setIsSavingProfile] = useState(false)

  // Document Viewer State
  const [viewerUrl, setViewerUrl] = useState<string | null>(null)
  const [viewerLoading, setViewerLoading] = useState(false)

  const handleViewDocument = async (publicUrl: string) => {
    setViewerLoading(true)
    try {
      const pathPart = publicUrl.split('/onboarding_documents/')[1]
      if (!pathPart) throw new Error('Invalid document URL')
      
      const { data, error } = await supabase.storage
        .from('onboarding_documents')
        .createSignedUrl(pathPart, 60)
        
      if (error) throw error
      if (data?.signedUrl) {
        setViewerUrl(data.signedUrl)
      }
    } catch (err) {
      console.error('Failed to load secure document', err)
      alert('Failed to securely load the document.')
    } finally {
      setViewerLoading(false)
    }
  }

  const openProfilePanel = (emp: EmployeeRow) => {
    setEditProfileId(emp.user_id)
    setEditProfileForm({
      fullName: emp.full_name,
      employeeCode: emp.employee_code || '',
      mobileNumber: (emp as any).mobile_number || '',
    })
    setCurrentAadharUrl((emp as any).aadhar_card_url || null)
    setCurrentOtherDocs((emp as any).other_documents || [])
    setNewAadharFile(null)
    setNewOtherDocs(null)
    setEditProfileError('')
  }

  const openSalaryPanel = (userId: string, name: string) => {
    setEditUserId(userId)
    setEditUserName(name)
    setSalaryAmount('')
    setEffectiveFrom(format(new Date(), 'yyyy-MM-dd'))
    setPanelError('')
  }

  const handleSaveSalary = async (e: FormEvent) => {
    e.preventDefault()
    setPanelError('')
    if (!editUserId || !salaryAmount) return

    try {
      await addSalary.mutateAsync({
        user_id: editUserId,
        amount: parseFloat(salaryAmount),
        effective_from: effectiveFrom,
      })
      setEditUserId(null)
    } catch (err: unknown) {
      const errObj = err as { message?: string }
      setPanelError(errObj.message || 'Failed to save salary.')
    }
  }

  const handleSaveProfile = async (e: FormEvent) => {
    e.preventDefault()
    setEditProfileError('')
    setIsSavingProfile(true)
    if (!editProfileId) return

    try {
      let aadharUrl = currentAadharUrl
      const otherDocUrls: string[] = [...currentOtherDocs]

      if (newAadharFile) {
        const ext = newAadharFile.name.split('.').pop()
        const path = `${editProfileId}/aadhar_${Date.now()}.${ext}`
        const { error: uploadError } = await supabase.storage.from('onboarding_documents').upload(path, newAadharFile)
        if (uploadError) throw uploadError
        aadharUrl = supabase.storage.from('onboarding_documents').getPublicUrl(path).data.publicUrl
      }

      if (newOtherDocs && newOtherDocs.length > 0) {
        for (let i = 0; i < newOtherDocs.length; i++) {
          const file = newOtherDocs[i]
          const ext = file.name.split('.').pop()
          const path = `${editProfileId}/other_${i}_${Date.now()}.${ext}`
          const { error: uploadError } = await supabase.storage.from('onboarding_documents').upload(path, file)
          if (uploadError) throw uploadError
          otherDocUrls.push(supabase.storage.from('onboarding_documents').getPublicUrl(path).data.publicUrl)
        }
      }

      await updateProfile.mutateAsync({
        user_id: editProfileId,
        full_name: editProfileForm.fullName,
        employee_code: editProfileForm.employeeCode || undefined,
        mobile_number: editProfileForm.mobileNumber || undefined,
        aadhar_card_url: aadharUrl || undefined,
        other_documents: otherDocUrls,
      })

      setEditProfileId(null)
    } catch (err: unknown) {
      const errObj = err as { message?: string }
      setEditProfileError(errObj.message || 'Failed to save profile.')
    } finally {
      setIsSavingProfile(false)
    }
  }

  const handleAddEmployee = async (e: FormEvent) => {
    e.preventDefault()
    setAddError('')
    setIsAdding(true)

    try {
      // 1. Create the user via Edge Function
      const result = await createEmployee.mutateAsync({
        email: addForm.email,
        password: addForm.password || undefined,
        full_name: addForm.fullName,
        mobile_number: addForm.mobileNumber,
      })

      const newUserId = result.user_id

      let aadharUrl = null
      const otherDocUrls: string[] = []

      // 2. Upload Aadhar
      if (aadharFile) {
        const ext = aadharFile.name.split('.').pop()
        const path = `${newUserId}/aadhar.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('onboarding_documents')
          .upload(path, aadharFile)

        if (uploadError) throw uploadError
        aadharUrl = supabase.storage.from('onboarding_documents').getPublicUrl(path).data.publicUrl
      }

      // 3. Upload Other Docs
      if (otherDocs && otherDocs.length > 0) {
        for (let i = 0; i < otherDocs.length; i++) {
          const file = otherDocs[i]
          const ext = file.name.split('.').pop()
          const path = `${newUserId}/other_${i}_${Date.now()}.${ext}`
          const { error: uploadError } = await supabase.storage
            .from('onboarding_documents')
            .upload(path, file)
          
          if (uploadError) throw uploadError
          otherDocUrls.push(supabase.storage.from('onboarding_documents').getPublicUrl(path).data.publicUrl)
        }
      }

      // 4. Update profile with file URLs if any files were uploaded
      if (aadharUrl || otherDocUrls.length > 0) {
        const updatePayload: Database['public']['Tables']['profiles']['Update'] = {}
        // Since we didn't regenerate typescript types yet for these new columns in our frontend type alias,
        // we use any cast temporarily to pass the new columns, or we can just pass them if they are mapped.
        if (aadharUrl) (updatePayload as any).aadhar_card_url = aadharUrl
        if (otherDocUrls.length > 0) (updatePayload as any).other_documents = otherDocUrls

        await supabase.from('profiles').update(updatePayload).eq('user_id', newUserId)
      }

      setShowAddModal(false)
      setAddForm({ fullName: '', email: '', password: '', mobileNumber: '' })
      setAadharFile(null)
      setOtherDocs(null)
      queryClient.invalidateQueries({ queryKey: ['admin_employees'] })
    } catch (err: unknown) {
      const errObj = err as { message?: string }
      setAddError(errObj.message || 'Failed to create employee.')
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Employees</h1>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          <Plus size={18} style={{ marginRight: '8px' }} />
          Add Employee
        </button>
      </div>

      <div className="card">
        {isLoading ? (
          <SkeletonTable rows={5} cols={5} />
        ) : !employees || employees.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No employees found"
            description="Create employee users to see them here."
          />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" id="employees-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Code</th>
                  <th>Contact</th>
                  <th>Active</th>
                  <th>Current Salary</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp) => (
                  <tr key={emp.user_id}>
                    <td>
                      <div className="flex items-center gap-2">
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            background: emp.is_active ? 'var(--accent-light)' : '#F3F4F6',
                            color: emp.is_active ? 'var(--accent)' : '#9CA3AF',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '11px',
                            fontWeight: 600,
                            flexShrink: 0,
                          }}
                        >
                          {getInitials(emp.full_name)}
                        </div>
                        <span style={{ opacity: emp.is_active ? 1 : 0.5 }}>{emp.full_name}</span>
                      </div>
                    </td>
                    <td className="text-secondary">{emp.employee_code || '—'}</td>
                    <td className="text-secondary" style={{ fontSize: '13px' }}>
                      {/* Using any for mobile_number since TS types might not be generated yet */}
                      {(emp as any).mobile_number || '—'}
                    </td>
                    <td>
                      <label className="toggle">
                        <input
                          type="checkbox"
                          checked={emp.is_active}
                          onChange={(e) =>
                            toggleActive.mutate({
                              userId: emp.user_id,
                              isActive: e.target.checked,
                            })
                          }
                        />
                        <span className="toggle-slider" />
                      </label>
                    </td>
                    <td>
                      {emp.current_salary != null ? (
                        <MoneyDisplay amount={emp.current_salary} />
                      ) : (
                        <span className="text-danger" style={{ fontSize: '13px' }}>Not set</span>
                      )}
                    </td>
                    <td style={{ display: 'flex', gap: '8px' }}>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => openProfilePanel(emp)}
                      >
                        Edit Profile
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => openSalaryPanel(emp.user_id, emp.full_name)}
                      >
                        Edit Salary
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Salary Side Panel */}
      {editUserId && (
        <>
          <div className="side-panel-overlay" onClick={() => setEditUserId(null)} />
          <div className="side-panel">
            <div className="side-panel-header">
              <h3 style={{ fontSize: '16px', fontWeight: 600 }}>
                Edit Salary — {editUserName}
              </h3>
              <button
                className="btn btn-icon btn-ghost"
                onClick={() => setEditUserId(null)}
                aria-label="Close panel"
              >
                <X size={18} />
              </button>
            </div>
            <div className="side-panel-body">
              <form onSubmit={handleSaveSalary} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="new-salary">New Monthly Base Salary</label>
                  <input
                    id="new-salary"
                    type="number"
                    className="form-input"
                    value={salaryAmount}
                    onChange={(e) => setSalaryAmount(e.target.value)}
                    placeholder="50000"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="salary-effective">Effective From</label>
                  <input
                    id="salary-effective"
                    type="date"
                    className="form-input"
                    value={effectiveFrom}
                    onChange={(e) => setEffectiveFrom(e.target.value)}
                    required
                  />
                </div>
                {panelError && <div className="alert alert-error">{panelError}</div>}
                <button
                  type="submit"
                  className="btn btn-primary w-full"
                  disabled={addSalary.isPending}
                >
                  {addSalary.isPending ? 'Saving…' : 'Save'}
                </button>
              </form>
            </div>
          </div>
        </>
      )}

      {/* Add Employee Modal */}
      {showAddModal && (
        <>
          <div className="side-panel-overlay" onClick={() => !isAdding && setShowAddModal(false)} />
          <div className="side-panel" style={{ width: '450px' }}>
            <div className="side-panel-header">
              <h3 style={{ fontSize: '18px', fontWeight: 600 }}>Add New Employee</h3>
              <button
                className="btn btn-icon btn-ghost"
                onClick={() => !isAdding && setShowAddModal(false)}
                disabled={isAdding}
              >
                <X size={18} />
              </button>
            </div>
            <div className="side-panel-body" style={{ overflowY: 'auto' }}>
              <form onSubmit={handleAddEmployee} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={addForm.fullName}
                    onChange={(e) => setAddForm({ ...addForm, fullName: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Email Address *</label>
                  <input
                    type="email"
                    className="form-input"
                    value={addForm.email}
                    onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Password</label>
                  <input
                    type="password"
                    className="form-input"
                    placeholder="Leave blank to auto-generate"
                    value={addForm.password}
                    onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                  />
                  <div className="text-secondary mt-1" style={{ fontSize: '12px' }}>
                    If left blank, a secure password will be generated and they must reset it via email.
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Mobile Number</label>
                  <input
                    type="tel"
                    className="form-input"
                    value={addForm.mobileNumber}
                    onChange={(e) => setAddForm({ ...addForm, mobileNumber: e.target.value })}
                  />
                </div>

                <hr style={{ borderColor: 'var(--border)', margin: '8px 0' }} />
                <h4 style={{ fontSize: '14px', fontWeight: 600 }}>Onboarding Documents</h4>

                <div className="form-group">
                  <label className="form-label">Aadhar Card</label>
                  <input
                    type="file"
                    className="form-input"
                    accept="image/*,.pdf"
                    onChange={(e) => setAadharFile(e.target.files?.[0] || null)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Other Documents</label>
                  <input
                    type="file"
                    className="form-input"
                    multiple
                    onChange={(e) => setOtherDocs(e.target.files)}
                  />
                </div>

                {addError && <div className="alert alert-error">{addError}</div>}

                <div style={{ marginTop: 'auto', paddingTop: '20px' }}>
                  <button
                    type="submit"
                    className="btn btn-primary w-full"
                    disabled={isAdding}
                  >
                    {isAdding ? 'Creating User & Uploading...' : 'Create Employee'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}

      {/* Edit Profile Modal */}
      {editProfileId && (
        <>
          <div className="side-panel-overlay" onClick={() => !isSavingProfile && setEditProfileId(null)} />
          <div className="side-panel" style={{ width: '500px' }}>
            <div className="side-panel-header">
              <h3 style={{ fontSize: '18px', fontWeight: 600 }}>Edit Employee Profile</h3>
              <button
                className="btn btn-icon btn-ghost"
                onClick={() => !isSavingProfile && setEditProfileId(null)}
                disabled={isSavingProfile}
              >
                <X size={18} />
              </button>
            </div>
            <div className="side-panel-body" style={{ overflowY: 'auto' }}>
              <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editProfileForm.fullName}
                    onChange={(e) => setEditProfileForm({ ...editProfileForm, fullName: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Employee Code</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editProfileForm.employeeCode}
                    onChange={(e) => setEditProfileForm({ ...editProfileForm, employeeCode: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Mobile Number</label>
                  <input
                    type="tel"
                    className="form-input"
                    value={editProfileForm.mobileNumber}
                    onChange={(e) => setEditProfileForm({ ...editProfileForm, mobileNumber: e.target.value })}
                  />
                </div>

                <hr style={{ borderColor: 'var(--border)', margin: '8px 0' }} />
                <h4 style={{ fontSize: '14px', fontWeight: 600 }}>Onboarding Documents</h4>

                <div className="form-group">
                  <label className="form-label">Aadhar Card</label>
                  {currentAadharUrl && (
                    <div className="mb-2">
                      <button 
                        type="button"
                        onClick={() => handleViewDocument(currentAadharUrl)}
                        className="btn btn-ghost text-accent flex items-center gap-1" 
                        style={{ padding: '4px 8px', border: 'none', background: 'transparent', fontSize: '13px' }}
                        disabled={viewerLoading}
                      >
                        <FileText size={14} /> {viewerLoading ? 'Loading...' : 'View Current Aadhar Card'}
                      </button>
                    </div>
                  )}
                  <input
                    type="file"
                    className="form-input"
                    accept="image/*,.pdf"
                    onChange={(e) => setNewAadharFile(e.target.files?.[0] || null)}
                  />
                  <div className="text-secondary mt-1" style={{ fontSize: '12px' }}>
                    Selecting a new file will replace the current one.
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Other Documents</label>
                  {currentOtherDocs.length > 0 && (
                    <div className="mb-2 flex flex-col gap-1">
                      {currentOtherDocs.map((url, i) => (
                        <div key={i} className="flex items-center gap-2">
                           <button 
                            type="button"
                            onClick={() => handleViewDocument(url)}
                            className="btn btn-ghost text-accent flex items-center gap-1" 
                            style={{ padding: '4px 8px', border: 'none', background: 'transparent', fontSize: '13px' }}
                            disabled={viewerLoading}
                          >
                            <FileText size={14} /> Document {i + 1}
                          </button>
                          <button
                            type="button"
                            className="btn btn-icon btn-ghost text-danger"
                            style={{ width: '24px', height: '24px', padding: 0 }}
                            onClick={() => setCurrentOtherDocs(currentOtherDocs.filter((_, index) => index !== i))}
                            title="Remove Document"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <input
                    type="file"
                    className="form-input"
                    multiple
                    onChange={(e) => setNewOtherDocs(e.target.files)}
                  />
                  <div className="text-secondary mt-1" style={{ fontSize: '12px' }}>
                    Selecting files will add them to the existing documents.
                  </div>
                </div>

                {editProfileError && <div className="alert alert-error">{editProfileError}</div>}

                <div style={{ marginTop: 'auto', paddingTop: '20px' }}>
                  <button type="submit" className="btn btn-primary w-full" disabled={isSavingProfile}>
                    {isSavingProfile ? 'Saving...' : 'Save Profile'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}

      {/* Secure Document Viewer Overlay */}
      {viewerUrl && (
        <div 
          style={{
            position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.85)'
          }}
          onClick={() => setViewerUrl(null)}
        >
          <div 
            style={{
              width: '95%', maxWidth: '900px', height: '90vh', background: 'white', borderRadius: '8px', overflow: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f9fafb' }}>
              <span style={{ fontWeight: 600, fontSize: '14px' }}>Secure Document Viewer</span>
              <button type="button" className="btn btn-icon btn-ghost" onClick={() => setViewerUrl(null)}>
                <X size={18} />
              </button>
            </div>
            <div style={{ flex: 1, background: '#e5e7eb', position: 'relative' }}>
              <iframe 
                src={viewerUrl} 
                style={{ width: '100%', height: '100%', border: 'none' }} 
                title="Secure Document"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
