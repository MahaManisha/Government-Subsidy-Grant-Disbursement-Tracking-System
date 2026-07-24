import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { ArrowLeft, Save, Info } from 'lucide-react';
import axiosInstance from '../api/axiosInstance';
import LoadingSpinner from '../components/LoadingSpinner';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function BeneficiaryForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm({
    defaultValues: {
      userId: '',
      uniqueIdNumber: '',
      phoneNumber: '',
      address: '',
      district: '',
      state: '',
      bankAccountNumber: '',
      bankIfscCode: '',
      dateOfBirth: '',
      annualIncome: '',
      eligibilityStatus: 'PENDING',
      gender: 'MALE',
      category: 'GENERAL'
    }
  });

  // Fetch registered users (for link selector)
  const fetchUsers = async () => {
    try {
      const response = await axiosInstance.get('/v1/users');
      if (response.data && response.data.success) {
        setUsers(response.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load users:', err);
    }
  };

  // Fetch existing beneficiary details for pre-population in Edit mode
  const fetchBeneficiaryDetails = async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.get(`/v1/beneficiaries/${id}`);
      if (response.data && response.data.success) {
        const data = response.data.data;
        reset({
          userId: data.user ? data.user.id : '',
          uniqueIdNumber: data.uniqueIdNumber,
          phoneNumber: data.phoneNumber,
          address: data.address,
          district: data.district || '',
          state: data.state || '',
          bankAccountNumber: data.bankAccountNumber,
          bankIfscCode: data.bankIfscCode,
          dateOfBirth: data.dateOfBirth || '',
          annualIncome: data.annualIncome,
          eligibilityStatus: data.eligibilityStatus,
          gender: data.gender,
          category: data.category
        });
      }
    } catch (err) {
      toast.error(err.message || 'Failed to retrieve beneficiary details.');
      navigate('/beneficiaries');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    if (isEdit) {
      fetchBeneficiaryDetails();
    }
  }, [id]);

  const onSubmit = async (data) => {
    setSubmitting(true);
    
    // Parse userId as number or null
    const payload = {
      ...data,
      userId: data.userId ? Number(data.userId) : null,
      annualIncome: Number(data.annualIncome)
    };

    try {
      let response;
      if (isEdit) {
        // Aadhaar and userId are immutable, so exclude from update payload
        const updatePayload = {
          phoneNumber: payload.phoneNumber,
          address: payload.address,
          district: payload.district,
          state: payload.state,
          bankAccountNumber: payload.bankAccountNumber,
          bankIfscCode: payload.bankIfscCode,
          dateOfBirth: payload.dateOfBirth || null,
          annualIncome: payload.annualIncome,
          eligibilityStatus: payload.eligibilityStatus,
          gender: payload.gender,
          category: payload.category
        };
        response = await axiosInstance.put(`/v1/beneficiaries/${id}`, updatePayload);
      } else {
        response = await axiosInstance.post('/v1/beneficiaries', payload);
      }

      if (response.data && response.data.success) {
        toast.success(
          isEdit
            ? 'Beneficiary profile updated successfully!'
            : 'New beneficiary profile created successfully!'
        );
        setTimeout(() => {
          navigate('/beneficiaries');
        }, 1500);
      }
    } catch (err) {
      if (err.validationErrors) {
        err.validationErrors.forEach((error) => toast.error(error));
      } else {
        toast.error(err.message || 'Failed to save beneficiary profile.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-100 py-20 shadow-sm">
        <LoadingSpinner size="large" />
        <p className="text-center text-xs font-semibold text-slate-400 mt-4">Loading profile details...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ToastContainer position="top-right" autoClose={3000} />
      
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Link
          to="/beneficiaries"
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-slate-800 transition-all shadow-sm"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-800">
            {isEdit ? 'Update Beneficiary Profile' : 'Register New Beneficiary'}
          </h1>
          <p className="text-slate-500 mt-1">
            {isEdit ? 'Modify profile properties and status parameters.' : 'Register a new citizen in the subsidy database.'}
          </p>
        </div>
      </div>

      {/* Form Container */}
      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm max-w-4xl">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          
          {/* Identity & Account Link */}
          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-slate-800 mb-4 border-b border-slate-50 pb-2">
              1. Account Association & Credentials
            </h4>
            <div className="grid gap-6 sm:grid-cols-2">
              {/* Linked User Profile Selector */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Link Registered User Account (Optional)
                </label>
                <select
                  disabled={isEdit}
                  {...register('userId')}
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none cursor-pointer focus:border-govBlue disabled:opacity-50"
                >
                  <option value="">-- No Account Association --</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.firstName} {user.lastName} ({user.username} - {user.email})
                    </option>
                  ))}
                </select>
                {isEdit && (
                  <p className="text-[10px] text-slate-400 mt-1">User association is immutable after creation.</p>
                )}
              </div>

              {/* Aadhaar (uniqueIdNumber) */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Aadhaar Number (12 Digits) *
                </label>
                <input
                  type="text"
                  maxLength={12}
                  disabled={isEdit}
                  placeholder="Enter 12-digit UID"
                  {...register('uniqueIdNumber', {
                    required: !isEdit && 'Aadhaar UID is required',
                    pattern: { value: /^[0-9]{12}$/, message: 'Aadhaar UID must be exactly 12 digits' }
                  })}
                  className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-govBlue disabled:opacity-50 font-mono"
                />
                {errors.uniqueIdNumber && (
                  <p className="text-xs text-rose-500 mt-1 font-semibold">{errors.uniqueIdNumber.message}</p>
                )}
                {isEdit && (
                  <p className="text-[10px] text-slate-400 mt-1">Aadhaar UID number is immutable.</p>
                )}
              </div>
            </div>
          </div>

          {/* Contact Details */}
          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-slate-800 mb-4 border-b border-slate-50 pb-2">
              2. Contact & Regional Parameters
            </h4>
            <div className="grid gap-6 sm:grid-cols-2">
              {/* Phone */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Mobile Number *
                </label>
                <input
                  type="text"
                  placeholder="e.g. 9876543210"
                  {...register('phoneNumber', {
                    required: 'Mobile number is required',
                    pattern: { value: /^\+?[0-9]{10,15}$/, message: 'Enter a valid 10-15 digit phone number' }
                  })}
                  className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-govBlue"
                />
                {errors.phoneNumber && (
                  <p className="text-xs text-rose-500 mt-1 font-semibold">{errors.phoneNumber.message}</p>
                )}
              </div>

              {/* DOB */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Date of Birth *
                </label>
                <input
                  type="date"
                  {...register('dateOfBirth', { required: 'Date of birth is required' })}
                  className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-govBlue"
                />
                {errors.dateOfBirth && (
                  <p className="text-xs text-rose-500 mt-1 font-semibold">{errors.dateOfBirth.message}</p>
                )}
              </div>

              {/* District */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  District
                </label>
                <input
                  type="text"
                  placeholder="e.g. Central Delhi"
                  {...register('district')}
                  className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-govBlue"
                />
              </div>

              {/* State */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  State
                </label>
                <input
                  type="text"
                  placeholder="e.g. Delhi"
                  {...register('state')}
                  className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-govBlue"
                />
              </div>

              {/* Address */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Correspondence Address *
                </label>
                <textarea
                  rows={3}
                  placeholder="Enter full address detail"
                  {...register('address', {
                    required: 'Address is required',
                    maxLength: { value: 500, message: 'Address cannot exceed 500 characters' }
                  })}
                  className="w-full rounded-lg border border-slate-200 p-3 text-sm outline-none focus:border-govBlue"
                />
                {errors.address && (
                  <p className="text-xs text-rose-500 mt-1 font-semibold">{errors.address.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Financials & Banking */}
          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-slate-800 mb-4 border-b border-slate-50 pb-2">
              3. Banking & Financial Details
            </h4>
            <div className="grid gap-6 sm:grid-cols-3">
              {/* Account number */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Bank Account Number *
                </label>
                <input
                  type="text"
                  placeholder="Enter account number"
                  {...register('bankAccountNumber', {
                    required: 'Bank account number is required',
                    minLength: { value: 9, message: 'Must be at least 9 characters' },
                    maxLength: { value: 20, message: 'Cannot exceed 20 characters' }
                  })}
                  className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-govBlue font-mono"
                />
                {errors.bankAccountNumber && (
                  <p className="text-xs text-rose-500 mt-1 font-semibold">{errors.bankAccountNumber.message}</p>
                )}
              </div>

              {/* IFSC */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  IFSC Code *
                </label>
                <input
                  type="text"
                  placeholder="e.g. SBIN0001234"
                  {...register('bankIfscCode', {
                    required: 'Bank IFSC is required',
                    pattern: { value: /^[A-Z]{4}0[A-Z0-9]{6}$/, message: 'Enter a valid 11-char IFSC code' }
                  })}
                  className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-govBlue font-mono uppercase"
                />
                {errors.bankIfscCode && (
                  <p className="text-xs text-rose-500 mt-1 font-semibold">{errors.bankIfscCode.message}</p>
                )}
              </div>

              {/* Annual Income */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Annual Income (in ₹) *
                </label>
                <input
                  type="number"
                  placeholder="e.g. 150000"
                  {...register('annualIncome', {
                    required: 'Annual income is required',
                    min: { value: 0, message: 'Income cannot be negative' }
                  })}
                  className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-govBlue"
                />
                {errors.annualIncome && (
                  <p className="text-xs text-rose-500 mt-1 font-semibold">{errors.annualIncome.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Social Categories & Initial Status */}
          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-slate-800 mb-4 border-b border-slate-50 pb-2">
              4. Social Classifications & Flags
            </h4>
            <div className="grid gap-6 sm:grid-cols-3">
              {/* Category */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Social Category *
                </label>
                <select
                  {...register('category', { required: 'Category is required' })}
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none cursor-pointer focus:border-govBlue"
                >
                  <option value="GENERAL">General</option>
                  <option value="OBC">OBC</option>
                  <option value="SC">SC</option>
                  <option value="ST">ST</option>
                  <option value="BPL">BPL</option>
                </select>
              </div>

              {/* Gender */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Gender *
                </label>
                <select
                  {...register('gender', { required: 'Gender is required' })}
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none cursor-pointer focus:border-govBlue"
                >
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Eligibility Status *
                </label>
                <select
                  {...register('eligibilityStatus', { required: 'Status is required' })}
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none cursor-pointer focus:border-govBlue"
                >
                  <option value="PENDING">PENDING</option>
                  <option value="VERIFIED">VERIFIED</option>
                  <option value="REJECTED">REJECTED</option>
                  <option value="RE_VERIFICATION_REQUESTED">RE VERIFICATION REQUESTED</option>
                </select>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end space-x-3 border-t border-slate-100 pt-4">
            <Link
              to="/beneficiaries"
              className="h-10 px-6 rounded-lg border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all flex items-center justify-center"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="h-10 px-6 rounded-lg bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700 transition-all flex items-center justify-center space-x-2 shadow-sm disabled:opacity-50"
            >
              {submitting ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-t-white border-blue-600" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              <span>{isEdit ? 'Save Changes' : 'Register Beneficiary'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
