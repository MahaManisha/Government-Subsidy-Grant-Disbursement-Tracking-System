import React, { useState, useEffect, useCallback } from 'react';
import {
  Search, UserPlus, UserMinus, UserCheck, ShieldAlert,
  CheckCircle2, XCircle, Edit3, KeyRound, X, Eye, EyeOff,
  Loader2, Shield, Users as UsersIcon, AlertCircle, ChevronDown, Trash2
} from 'lucide-react';
import { ToastContainer, toast } from 'react-toastify';
import axiosInstance from '../api/axiosInstance';
import LoadingSpinner from '../components/LoadingSpinner';
import 'react-toastify/dist/ReactToastify.css';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Staff roles available for Admin to assign.
 * ROLE_BENEFICIARY is intentionally excluded — citizens self-register via /register.
 */
const STAFF_ROLES = [
  { value: 'ROLE_ADMIN', label: 'Administrator', color: 'purple' },
  { value: 'ROLE_FIELD_OFFICER', label: 'Field Officer', color: 'blue' },
  { value: 'ROLE_DISTRICT_OFFICER', label: 'District Officer', color: 'indigo' },
  { value: 'ROLE_FINANCE_OFFICER', label: 'Finance Officer', color: 'emerald' },
];

const ROLE_BADGE_STYLES = {
  ROLE_ADMIN: 'bg-purple-50 text-purple-700 ring-purple-700/10',
  ROLE_FIELD_OFFICER: 'bg-blue-50 text-blue-700 ring-blue-700/10',
  ROLE_DISTRICT_OFFICER: 'bg-indigo-50 text-indigo-700 ring-indigo-700/10',
  ROLE_FINANCE_OFFICER: 'bg-emerald-50 text-emerald-700 ring-emerald-700/10',
  ROLE_BENEFICIARY: 'bg-amber-50 text-amber-700 ring-amber-700/10',
};

const EMPTY_CREATE_FORM = {
  firstName: '', lastName: '', username: '', password: '', confirmPassword: '',
  email: '', phone: '', designation: '', role: 'ROLE_FIELD_OFFICER',
};

const EMPTY_RESET_FORM = { newPassword: '', confirmPassword: '' };

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ModalOverlay({ onClose, children }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {children}
    </div>
  );
}

function FieldError({ msg }) {
  if (!msg) return null;
  return <p className="mt-1 text-xs text-red-500 flex items-center gap-1"><AlertCircle className="h-3 w-3" />{msg}</p>;
}

function FormField({ label, required, children, error }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      <FieldError msg={error} />
    </div>
  );
}

function inputCls(hasError) {
  return `block w-full h-10 rounded-xl border px-3 text-sm outline-none transition-all ${
    hasError
      ? 'border-red-400 bg-red-50 focus:border-red-500 focus:ring-1 focus:ring-red-500'
      : 'border-slate-200 bg-slate-50 focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500'
  }`;
}

// ---------------------------------------------------------------------------
// Create Staff Account Modal
// ---------------------------------------------------------------------------

function CreateStaffModal({ onClose, onSuccess }) {
  const [form, setForm] = useState(EMPTY_CREATE_FORM);
  const [errors, setErrors] = useState({});
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const validate = () => {
    const errs = {};
    if (!form.firstName.trim()) errs.firstName = 'First name is required';
    if (!form.lastName.trim()) errs.lastName = 'Last name is required';
    if (!form.username.trim() || form.username.length < 3) errs.username = 'Username must be at least 3 characters';
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Valid email is required';
    if (!form.password || form.password.length < 6) errs.password = 'Password must be at least 6 characters';
    if (form.password !== form.confirmPassword) errs.confirmPassword = 'Passwords do not match';
    if (!form.role) errs.role = 'Role is required';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setSaving(true);
    try {
      const payload = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        username: form.username.trim(),
        password: form.password,
        confirmPassword: form.confirmPassword,
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        designation: form.designation.trim() || undefined,
        roles: [form.role],
      };
      const res = await axiosInstance.post('/v1/users', payload);
      if (res.data?.success) {
        toast.success(`Staff account '${form.username}' created successfully!`);
        onClose();
        setTimeout(() => onSuccess(), 300);
      } else {
        toast.error(res.data?.message || 'Failed to create account');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to create staff account');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalOverlay onClose={onClose}>
      <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-7 py-5 border-b border-slate-100 bg-gradient-to-r from-blue-600 to-indigo-600">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20">
              <UserPlus className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Create Staff Account</h2>
              <p className="text-xs text-blue-100 mt-0.5">Government staff only — not for citizens</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-white/70 hover:text-white hover:bg-white/10 transition-all cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Info Banner */}
        <div className="mx-7 mt-5 flex items-start gap-2.5 rounded-xl bg-amber-50 border border-amber-200 p-3.5">
          <Shield className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700">
            <strong>Admin action:</strong> After creating the account, securely communicate the username and password to the staff member. Citizens register themselves via the public portal.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="px-7 py-5 space-y-4">
          {/* Name Row */}
          <div className="grid grid-cols-2 gap-4">
            <FormField label="First Name" required error={errors.firstName}>
              <input id="create-firstName" className={inputCls(!!errors.firstName)} value={form.firstName} onChange={set('firstName')} placeholder="Ramesh" />
            </FormField>
            <FormField label="Last Name" required error={errors.lastName}>
              <input id="create-lastName" className={inputCls(!!errors.lastName)} value={form.lastName} onChange={set('lastName')} placeholder="Kumar" />
            </FormField>
          </div>

          {/* Username & Email */}
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Username" required error={errors.username}>
              <input id="create-username" className={inputCls(!!errors.username)} value={form.username} onChange={set('username')} placeholder="ramesh_kumar" />
            </FormField>
            <FormField label="Email" required error={errors.email}>
              <input id="create-email" type="email" className={inputCls(!!errors.email)} value={form.email} onChange={set('email')} placeholder="ramesh@gov.in" />
            </FormField>
          </div>

          {/* Password Row */}
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Password" required error={errors.password}>
              <div className="relative">
                <input
                  id="create-password"
                  type={showPwd ? 'text' : 'password'}
                  className={inputCls(!!errors.password) + ' pr-10'}
                  value={form.password}
                  onChange={set('password')}
                  placeholder="Min. 6 characters"
                />
                <button type="button" onClick={() => setShowPwd(!showPwd)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 cursor-pointer">
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </FormField>
            <FormField label="Confirm Password" required error={errors.confirmPassword}>
              <div className="relative">
                <input
                  id="create-confirmPassword"
                  type={showConfirm ? 'text' : 'password'}
                  className={inputCls(!!errors.confirmPassword) + ' pr-10'}
                  value={form.confirmPassword}
                  onChange={set('confirmPassword')}
                  placeholder="Re-enter password"
                />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 cursor-pointer">
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </FormField>
          </div>

          {/* Phone & Designation */}
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Phone Number" error={errors.phone}>
              <input id="create-phone" className={inputCls(!!errors.phone)} value={form.phone} onChange={set('phone')} placeholder="+91 98765 43210" />
            </FormField>
            <FormField label="Designation" error={errors.designation}>
              <input id="create-designation" className={inputCls(!!errors.designation)} value={form.designation} onChange={set('designation')} placeholder="e.g. Field Officer, Pune" />
            </FormField>
          </div>

          {/* Role */}
          <FormField label="Role" required error={errors.role}>
            <div className="relative">
              <select
                id="create-role"
                className={inputCls(!!errors.role) + ' appearance-none pr-10 cursor-pointer'}
                value={form.role}
                onChange={set('role')}
              >
                {STAFF_ROLES.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            </div>
          </FormField>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 h-10 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all cursor-pointer">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 h-10 rounded-xl bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700 transition-all shadow-sm shadow-blue-500/20 disabled:opacity-60 cursor-pointer flex items-center justify-center gap-2">
              {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating...</> : <><UserPlus className="h-4 w-4" /> Create Account</>}
            </button>
          </div>
        </form>
      </div>
    </ModalOverlay>
  );
}

// ---------------------------------------------------------------------------
// Edit Staff Account Modal
// ---------------------------------------------------------------------------

function EditStaffModal({ user, onClose, onSuccess }) {
  const [form, setForm] = useState({
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    username: user.username || '',
    email: user.email || '',
    phone: user.phone || '',
    designation: user.designation || '',
    password: '',
    confirmPassword: '',
    role: user.roles && user.roles.size > 0 ? Array.from(user.roles)[0] : (user.roles?.[0] || 'ROLE_FIELD_OFFICER'),
  });
  const [errors, setErrors] = useState({});
  const [showPwd, setShowPwd] = useState(false);
  const [saving, setSaving] = useState(false);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const validate = () => {
    const errs = {};
    if (!form.firstName.trim()) errs.firstName = 'First name is required';
    if (!form.lastName.trim()) errs.lastName = 'Last name is required';
    if (!form.username.trim() || form.username.length < 3) errs.username = 'Username must be at least 3 characters';
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Valid email is required';
    if (form.password && form.password.length < 6) errs.password = 'Password must be at least 6 characters';
    if (form.password && form.password !== form.confirmPassword) errs.confirmPassword = 'Passwords do not match';
    if (!form.role) errs.role = 'Role is required';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setSaving(true);
    try {
      const payload = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        username: form.username.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        designation: form.designation.trim() || undefined,
        password: form.password || user.password || 'unchanged_placeholder',
        roles: [form.role],
      };
      const res = await axiosInstance.put(`/v1/users/${user.id}`, payload);
      if (res.data?.success) {
        toast.success(`Account '${form.username}' updated successfully!`);
        onClose();
        setTimeout(() => onSuccess(), 300);
      } else {
        toast.error(res.data?.message || 'Failed to update account');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to update staff account');
    } finally {
      setSaving(false);
    }
  };

  // Extract roles safely (may be Set or Array)
  const currentRole = user.roles
    ? (Array.isArray(user.roles) ? user.roles[0] : Array.from(user.roles)[0]) || 'ROLE_FIELD_OFFICER'
    : 'ROLE_FIELD_OFFICER';

  const isBeneficiary = currentRole === 'ROLE_BENEFICIARY';

  return (
    <ModalOverlay onClose={onClose}>
      <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
        <div className="flex items-center justify-between px-7 py-5 border-b border-slate-100 bg-gradient-to-r from-slate-700 to-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15">
              <Edit3 className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Edit Staff Account</h2>
              <p className="text-xs text-slate-300 mt-0.5">@{user.username}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-white/70 hover:text-white hover:bg-white/10 transition-all cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        </div>

        {isBeneficiary && (
          <div className="mx-7 mt-5 flex items-start gap-2.5 rounded-xl bg-amber-50 border border-amber-200 p-3.5">
            <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700">
              This is a <strong>Beneficiary</strong> account. Role changes are restricted. Use the Beneficiary module to manage citizen profiles.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="px-7 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="First Name" required error={errors.firstName}>
              <input id="edit-firstName" className={inputCls(!!errors.firstName)} value={form.firstName} onChange={set('firstName')} />
            </FormField>
            <FormField label="Last Name" required error={errors.lastName}>
              <input id="edit-lastName" className={inputCls(!!errors.lastName)} value={form.lastName} onChange={set('lastName')} />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Username" required error={errors.username}>
              <input id="edit-username" className={inputCls(!!errors.username)} value={form.username} onChange={set('username')} />
            </FormField>
            <FormField label="Email" required error={errors.email}>
              <input id="edit-email" type="email" className={inputCls(!!errors.email)} value={form.email} onChange={set('email')} />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Phone Number" error={errors.phone}>
              <input id="edit-phone" className={inputCls(false)} value={form.phone} onChange={set('phone')} placeholder="+91 98765 43210" />
            </FormField>
            <FormField label="Designation" error={errors.designation}>
              <input id="edit-designation" className={inputCls(false)} value={form.designation} onChange={set('designation')} placeholder="e.g. Field Officer, Pune" />
            </FormField>
          </div>

          {/* Role — staff-only options; read-only for beneficiaries */}
          <FormField label="Role" required error={errors.role}>
            <div className="relative">
              <select
                id="edit-role"
                className={inputCls(!!errors.role) + ' appearance-none pr-10 cursor-pointer'}
                value={form.role}
                onChange={set('role')}
                disabled={isBeneficiary}
              >
                {isBeneficiary
                  ? <option value="ROLE_BENEFICIARY">Beneficiary (Citizen)</option>
                  : STAFF_ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)
                }
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            </div>
          </FormField>

          <div className="border-t border-slate-100 pt-3">
            <p className="text-xs text-slate-400 mb-3">Leave password blank to keep the existing password unchanged.</p>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="New Password (optional)" error={errors.password}>
                <div className="relative">
                  <input
                    id="edit-password"
                    type={showPwd ? 'text' : 'password'}
                    className={inputCls(!!errors.password) + ' pr-10'}
                    value={form.password}
                    onChange={set('password')}
                    placeholder="Leave blank to keep"
                  />
                  <button type="button" onClick={() => setShowPwd(!showPwd)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 cursor-pointer">
                    {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </FormField>
              <FormField label="Confirm Password" error={errors.confirmPassword}>
                <input
                  id="edit-confirmPassword"
                  type="password"
                  className={inputCls(!!errors.confirmPassword)}
                  value={form.confirmPassword}
                  onChange={set('confirmPassword')}
                  placeholder="Re-enter if changed"
                />
              </FormField>
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 h-10 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all cursor-pointer">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 h-10 rounded-xl bg-slate-800 text-sm font-semibold text-white hover:bg-slate-900 transition-all shadow-sm disabled:opacity-60 cursor-pointer flex items-center justify-center gap-2">
              {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</> : <><Edit3 className="h-4 w-4" /> Save Changes</>}
            </button>
          </div>
        </form>
      </div>
    </ModalOverlay>
  );
}

// ---------------------------------------------------------------------------
// Reset Password Modal
// ---------------------------------------------------------------------------

function ResetPasswordModal({ user, onClose, onSuccess }) {
  const [form, setForm] = useState(EMPTY_RESET_FORM);
  const [errors, setErrors] = useState({});
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const validate = () => {
    const errs = {};
    if (!form.newPassword || form.newPassword.length < 6) errs.newPassword = 'Password must be at least 6 characters';
    if (form.newPassword !== form.confirmPassword) errs.confirmPassword = 'Passwords do not match';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setSaving(true);
    try {
      const res = await axiosInstance.patch(`/v1/users/${user.id}/reset-password`, {
        newPassword: form.newPassword,
        confirmPassword: form.confirmPassword,
      });
      if (res.data?.success) {
        toast.success(`Password reset for '${user.username}' successfully!`);
        onSuccess();
        onClose();
      } else {
        toast.error(res.data?.message || 'Failed to reset password');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to reset password');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalOverlay onClose={onClose}>
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
        <div className="flex items-center justify-between px-7 py-5 border-b border-slate-100 bg-gradient-to-r from-orange-500 to-red-500">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20">
              <KeyRound className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Reset Password</h2>
              <p className="text-xs text-orange-100 mt-0.5">@{user.username}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-white/70 hover:text-white hover:bg-white/10 transition-all cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mx-7 mt-5 flex items-start gap-2.5 rounded-xl bg-orange-50 border border-orange-200 p-3.5">
          <Shield className="h-4 w-4 text-orange-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-orange-700">
            The new password will be BCrypt-encrypted before storage.
            After resetting, <strong>securely communicate</strong> the new password to <strong>{user.firstName} {user.lastName}</strong>.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="px-7 py-5 space-y-4">
          <FormField label="New Password" required error={errors.newPassword}>
            <div className="relative">
              <input
                id="reset-newPassword"
                type={showPwd ? 'text' : 'password'}
                className={inputCls(!!errors.newPassword) + ' pr-10'}
                value={form.newPassword}
                onChange={set('newPassword')}
                placeholder="Min. 6 characters"
              />
              <button type="button" onClick={() => setShowPwd(!showPwd)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 cursor-pointer">
                {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </FormField>

          <FormField label="Confirm New Password" required error={errors.confirmPassword}>
            <div className="relative">
              <input
                id="reset-confirmPassword"
                type={showConfirm ? 'text' : 'password'}
                className={inputCls(!!errors.confirmPassword) + ' pr-10'}
                value={form.confirmPassword}
                onChange={set('confirmPassword')}
                placeholder="Re-enter new password"
              />
              <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 cursor-pointer">
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </FormField>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 h-10 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all cursor-pointer">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 h-10 rounded-xl bg-orange-500 text-sm font-semibold text-white hover:bg-orange-600 transition-all shadow-sm shadow-orange-500/20 disabled:opacity-60 cursor-pointer flex items-center justify-center gap-2">
              {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Resetting...</> : <><KeyRound className="h-4 w-4" /> Reset Password</>}
            </button>
          </div>
        </form>
      </div>
    </ModalOverlay>
  );
}

// ---------------------------------------------------------------------------
// Role Badge
// ---------------------------------------------------------------------------

function RoleBadge({ role }) {
  const cls = ROLE_BADGE_STYLES[role] || 'bg-slate-100 text-slate-600 ring-slate-500/10';
  const label = role.replace('ROLE_', '').replace(/_/g, ' ');
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${cls}`}>
      {label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Main Users Component
// ---------------------------------------------------------------------------

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');

  // Modal states
  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [resetUser, setResetUser] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedDeleteUser, setSelectedDeleteUser] = useState(null);
  const [deletingPermanently, setDeletingPermanently] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.get('/v1/users');
      if (response.data?.success) {
        setUsers(response.data.data);
      } else {
        toast.error(response.data?.message || 'Failed to fetch users');
      }
    } catch (err) {
      toast.error(err.message || 'An error occurred while fetching users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleDeactivate = async (u) => {
    if (!window.confirm(`Deactivate account for '${u.username}'? They will no longer be able to log in.`)) return;
    try {
      const res = await axiosInstance.delete(`/v1/users/${u.id}`);
      if (res.data?.success) {
        toast.success(`'${u.username}' deactivated.`);
        fetchUsers();
      } else {
        toast.error(res.data?.message || 'Failed to deactivate');
      }
    } catch (err) {
      toast.error(err.message || 'Error during deactivation');
    }
  };

  const handleActivate = async (u) => {
    if (!window.confirm(`Activate account for '${u.username}'? They will be able to log in again.`)) return;
    try {
      const res = await axiosInstance.patch(`/v1/users/${u.id}/activate`);
      if (res.data?.success) {
        toast.success(`'${u.username}' activated.`);
        fetchUsers();
      } else {
        toast.error(res.data?.message || 'Failed to activate');
      }
    } catch (err) {
      toast.error(err.message || 'Error during activation');
    }
  };

  const handlePermanentDelete = async () => {
    if (!selectedDeleteUser) return;
    setDeletingPermanently(true);
    try {
      const res = await axiosInstance.delete(`/v1/users/${selectedDeleteUser.id}/permanent`);
      if (res.data?.success) {
        toast.success(`User '${selectedDeleteUser.username}' deleted permanently.`);
        setShowDeleteConfirm(false);
        setSelectedDeleteUser(null);
        fetchUsers();
      } else {
        toast.error(res.data?.message || 'Failed to delete user.');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'An error occurred while deleting user.');
    } finally {
      setDeletingPermanently(false);
    }
  };

  // Filtering
  const filtered = users.filter((u) => {
    const rolesArr = u.roles ? Array.from(u.roles) : [];
    const matchSearch =
      u.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.lastName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchRole = filterRole === 'ALL' || rolesArr.includes(filterRole);
    const matchStatus =
      filterStatus === 'ALL' ||
      (filterStatus === 'ACTIVE' && u.active) ||
      (filterStatus === 'INACTIVE' && !u.active);
    return matchSearch && matchRole && matchStatus;
  });

  const statsTotal = users.length;
  const statsActive = users.filter((u) => u.active).length;
  const statsStaff = users.length;

  return (
    <div className="space-y-6">
      <ToastContainer position="top-right" autoClose={3500} />

      {/* Modals */}
      {showCreate && (
        <CreateStaffModal
          onClose={() => setShowCreate(false)}
          onSuccess={fetchUsers}
        />
      )}
      {editUser && (
        <EditStaffModal
          user={editUser}
          onClose={() => setEditUser(null)}
          onSuccess={fetchUsers}
        />
      )}
      {resetUser && (
        <ResetPasswordModal
          user={resetUser}
          onClose={() => setResetUser(null)}
          onSuccess={fetchUsers}
        />
      )}

      {showDeleteConfirm && selectedDeleteUser && (
        <ModalOverlay onClose={() => setShowDeleteConfirm(false)}>
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
            <div className="flex items-center justify-between px-7 py-5 border-b border-slate-100 bg-rose-600">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20">
                  <Trash2 className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Delete User Permanently?</h2>
                  <p className="text-xs text-rose-100 mt-0.5">@{selectedDeleteUser.username}</p>
                </div>
              </div>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="rounded-lg p-1.5 text-white/70 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-7 space-y-6">
              <p className="text-sm text-slate-600 leading-relaxed font-semibold">
                This action will permanently remove this user account and cannot be undone.
              </p>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 h-10 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handlePermanentDelete}
                  disabled={deletingPermanently}
                  className="flex-1 h-10 rounded-xl bg-rose-600 text-sm font-semibold text-white hover:bg-rose-700 transition-all shadow-sm disabled:opacity-60 cursor-pointer flex items-center justify-center gap-2"
                >
                  {deletingPermanently ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  Delete Permanently
                </button>
              </div>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-800 flex items-center gap-2.5">
            <UsersIcon className="h-6 w-6 text-blue-600" />
            User Accounts
          </h1>
          <p className="text-slate-500 mt-1 text-sm">
            Manage Government Staff accounts. Citizens self-register via the public portal.
          </p>
        </div>
        <button
          id="btn-create-staff"
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-500/25 hover:bg-blue-700 active:bg-blue-800 transition-all cursor-pointer"
        >
          <UserPlus className="h-4 w-4" />
          + Create Staff Account
        </button>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: 'User Count', value: statsTotal, color: 'blue', icon: UsersIcon },
          { label: 'Staff Count', value: statsStaff, color: 'indigo', icon: Shield },
          { label: 'Active Count', value: statsActive, color: 'emerald', icon: CheckCircle2 },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-${color}-50 flex-shrink-0`}>
              <Icon className={`h-5 w-5 text-${color}-600`} />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">{label}</p>
              <p className="text-xl font-black text-slate-800">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters Row */}
      <div className="flex flex-col md:flex-row gap-3 items-start md:items-center bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
          <input
            id="users-search"
            type="text"
            placeholder="Search by name, username, email..."
            className="w-full h-9 rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Role Filter */}
        <div className="relative">
          <select
            id="filter-role"
            className="h-9 rounded-xl border border-slate-200 bg-slate-50 pl-3 pr-8 text-sm outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500 appearance-none cursor-pointer"
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
          >
            <option value="ALL">All Roles</option>
            {STAFF_ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
        </div>

        {/* Status Filter */}
        <div className="relative">
          <select
            id="filter-status"
            className="h-9 rounded-xl border border-slate-200 bg-slate-50 pl-3 pr-8 text-sm outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500 appearance-none cursor-pointer"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
        </div>

        <span className="ml-auto text-sm text-slate-500 font-medium">
          Showing <span className="font-bold text-slate-700">{filtered.length}</span> of {users.length} users
        </span>
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <LoadingSpinner />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <ShieldAlert className="h-8 w-8 text-slate-300 mb-3" />
            <p className="text-slate-500 font-semibold text-sm">No accounts found</p>
            <p className="text-slate-400 text-xs mt-1">Try adjusting your search or filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-400">
                  <th className="px-5 py-4">User</th>
                  <th className="px-5 py-4">Contact</th>
                  <th className="px-5 py-4">Role</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-sm">
                {filtered.map((u) => {
                  const rolesArr = u.roles ? Array.from(u.roles) : [];
                  const isBeneficiary = rolesArr.includes('ROLE_BENEFICIARY');
                  return (
                    <tr key={u.id} className="hover:bg-slate-50/70 transition-colors group">
                      {/* User cell */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-xs font-bold ${
                            isBeneficiary ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {(u.firstName?.[0] || '?').toUpperCase()}{(u.lastName?.[0] || '').toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800">{u.firstName} {u.lastName}</p>
                            <p className="text-xs text-slate-400">@{u.username}</p>
                          </div>
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="px-5 py-4">
                        <p className="text-slate-600 text-sm">{u.email}</p>
                        {u.phone && <p className="text-xs text-slate-400 mt-0.5">{u.phone}</p>}
                        {u.designation && <p className="text-xs text-slate-400 italic mt-0.5">{u.designation}</p>}
                      </td>

                      {/* Roles */}
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-1">
                          {rolesArr.length > 0
                            ? rolesArr.map((r) => <RoleBadge key={r} role={r} />)
                            : <span className="text-xs text-slate-400 italic">No role</span>
                          }
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4">
                        {u.active ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/10">
                            <CheckCircle2 className="h-3 w-3" /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500 ring-1 ring-inset ring-slate-500/10">
                            <XCircle className="h-3 w-3" /> Inactive
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Edit */}
                          <button
                            id={`btn-edit-${u.id}`}
                            onClick={() => setEditUser(u)}
                            title="Edit account"
                            className="inline-flex items-center gap-1 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 px-2.5 py-1.5 text-xs font-semibold transition-all cursor-pointer border border-slate-200"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                            Edit
                          </button>

                          {/* Reset Password */}
                          <button
                            id={`btn-reset-pwd-${u.id}`}
                            onClick={() => setResetUser(u)}
                            title="Reset password"
                            className="inline-flex items-center gap-1 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-600 px-2.5 py-1.5 text-xs font-semibold transition-all cursor-pointer border border-orange-200"
                          >
                            <KeyRound className="h-3.5 w-3.5" />
                            Reset PWD
                          </button>

                          {/* Activate / Deactivate */}
                           {u.active ? (
                            <button
                              id={`btn-deactivate-${u.id}`}
                              onClick={() => handleDeactivate(u)}
                              title="Deactivate account"
                              className="inline-flex items-center gap-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 px-2.5 py-1.5 text-xs font-semibold transition-all cursor-pointer border border-red-200"
                            >
                              <UserMinus className="h-3.5 w-3.5" />
                              Deactivate
                            </button>
                          ) : (
                            <button
                              id={`btn-activate-${u.id}`}
                              onClick={() => handleActivate(u)}
                              title="Activate account"
                              className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-600 px-2.5 py-1.5 text-xs font-semibold transition-all cursor-pointer border border-emerald-200"
                            >
                              <UserCheck className="h-3.5 w-3.5" />
                              Activate
                            </button>
                          )}

                          {/* Delete Permanently */}
                          <button
                            id={`btn-delete-perm-${u.id}`}
                            onClick={() => {
                              setSelectedDeleteUser(u);
                              setShowDeleteConfirm(true);
                            }}
                            title="Delete Permanently"
                            className="inline-flex items-center gap-1 rounded-lg bg-red-600 hover:bg-red-700 text-white px-2.5 py-1.5 text-xs font-semibold transition-all cursor-pointer border border-red-750"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
