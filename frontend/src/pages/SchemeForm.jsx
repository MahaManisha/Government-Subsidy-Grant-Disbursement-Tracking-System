import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { ArrowLeft, Save } from 'lucide-react';
import axiosInstance from '../api/axiosInstance';
import LoadingSpinner from '../components/LoadingSpinner';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function SchemeForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors }
  } = useForm({
    defaultValues: {
      name: '',
      code: '',
      description: '',
      budgetAllocation: '',
      startDate: '',
      endDate: '',
      active: true,
      status: 'ACTIVE',
      minAge: '',
      maxAge: '',
      maxAnnualIncome: '',
      gender: 'ANY',
      category: 'ANY',
      occupation: '',
      state: '',
      district: '',
      requiredDocuments: '',
      maxGrantAmount: ''
    }
  });

  const watchStartDate = watch('startDate');

  // Fetch details if Edit mode
  const fetchSchemeDetails = async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.get(`/v1/schemes/${id}`);
      if (response.data && response.data.success) {
        const data = response.data.data;
        reset({
          name: data.name,
          code: data.code,
          description: data.description,
          budgetAllocation: data.budgetAllocation,
          startDate: data.startDate,
          endDate: data.endDate,
          active: data.active,
          status: data.status,
          minAge: data.minAge || '',
          maxAge: data.maxAge || '',
          maxAnnualIncome: data.maxAnnualIncome || '',
          gender: data.gender || 'ANY',
          category: data.category || 'ANY',
          occupation: data.occupation || '',
          state: data.state || '',
          district: data.district || '',
          requiredDocuments: data.requiredDocuments || '',
          maxGrantAmount: data.maxGrantAmount || ''
        });
      }
    } catch (err) {
      toast.error(err.message || 'Failed to retrieve scheme details.');
      navigate('/schemes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isEdit) {
      fetchSchemeDetails();
    }
  }, [id]);

  const onSubmit = async (data) => {
    setSubmitting(true);
    
    // Format payload values
    const payload = {
      ...data,
      budgetAllocation: Number(data.budgetAllocation),
      minAge: data.minAge ? Number(data.minAge) : null,
      maxAge: data.maxAge ? Number(data.maxAge) : null,
      maxAnnualIncome: data.maxAnnualIncome ? Number(data.maxAnnualIncome) : null,
      maxGrantAmount: data.maxGrantAmount ? Number(data.maxGrantAmount) : null,
      gender: data.gender || 'ANY',
      category: data.category || 'ANY',
      occupation: data.occupation || null,
      state: data.state || null,
      district: data.district || null,
      requiredDocuments: data.requiredDocuments || null
    };

    try {
      let response;
      if (isEdit) {
        // Exclude immutable 'code' from update request payload
        const updatePayload = {
          name: payload.name,
          description: payload.description,
          budgetAllocation: payload.budgetAllocation,
          startDate: payload.startDate,
          endDate: payload.endDate,
          active: payload.active,
          status: payload.status,
          minAge: payload.minAge,
          maxAge: payload.maxAge,
          maxAnnualIncome: payload.maxAnnualIncome,
          gender: payload.gender,
          category: payload.category,
          occupation: payload.occupation,
          state: payload.state,
          district: payload.district,
          requiredDocuments: payload.requiredDocuments,
          maxGrantAmount: payload.maxGrantAmount
        };
        response = await axiosInstance.put(`/v1/schemes/${id}`, updatePayload);
      } else {
        response = await axiosInstance.post('/v1/schemes', payload);
      }

      if (response.data && response.data.success) {
        toast.success(
          isEdit
            ? `Scheme details updated successfully!`
            : `Scheme "${payload.name}" created successfully!`
        );
        setTimeout(() => {
          navigate('/schemes');
        }, 1500);
      }
    } catch (err) {
      if (err.validationErrors) {
        err.validationErrors.forEach((error) => toast.error(error));
      } else {
        toast.error(err.message || 'Failed to save scheme.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-100 py-20 shadow-sm">
        <LoadingSpinner size="large" />
        <p className="text-center text-xs font-semibold text-slate-400 mt-4">Retrieving scheme parameters...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ToastContainer position="top-right" autoClose={3000} />

      {/* Header */}
      <div className="flex items-center space-x-4">
        <Link
          to="/schemes"
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-slate-800 transition-all shadow-sm"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-800">
            {isEdit ? 'Update Scheme Details' : 'Create Government Scheme'}
          </h1>
          <p className="text-slate-500 mt-1">
            {isEdit ? 'Modify active parameters and budget caps.' : 'Configure a new grant program and budget limits.'}
          </p>
        </div>
      </div>

      {/* Form Card */}
      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm max-w-3xl">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          
          <div className="grid gap-6 sm:grid-cols-2">
            {/* Name */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Scheme Display Name *
              </label>
              <input
                type="text"
                placeholder="Enter full display name"
                {...register('name', {
                  required: 'Scheme name is required',
                  maxLength: { value: 150, message: 'Name cannot exceed 150 characters' }
                })}
                className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 outline-none focus:border-govBlue"
              />
              {errors.name && (
                <p className="text-xs text-rose-500 mt-1 font-semibold">{errors.name.message}</p>
              )}
            </div>

            {/* Code */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Unique Scheme Code *
              </label>
              <input
                type="text"
                disabled={isEdit}
                placeholder="e.g. PMFBY-2026"
                {...register('code', {
                  required: !isEdit && 'Scheme code is required',
                  pattern: {
                    value: /^[A-Z0-9_-]{2,30}$/,
                    message: 'Code must be 2-30 characters (uppercase, digits, hyphens, underscores)'
                  }
                })}
                className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-mono uppercase outline-none focus:border-govBlue disabled:opacity-50"
              />
              {errors.code && (
                <p className="text-xs text-rose-500 mt-1 font-semibold">{errors.code.message}</p>
              )}
              {isEdit && (
                <p className="text-[10px] text-slate-400 mt-1">Scheme codes are immutable references.</p>
              )}
            </div>

            {/* Budget */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Total Budget Allocation (in ₹) *
              </label>
              <input
                type="number"
                placeholder="e.g. 50000000"
                {...register('budgetAllocation', {
                  required: 'Budget allocation is required',
                  min: { value: 0.01, message: 'Budget must be greater than zero' }
                })}
                className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-govBlue font-semibold text-slate-700"
              />
              {errors.budgetAllocation && (
                <p className="text-xs text-rose-500 mt-1 font-semibold">{errors.budgetAllocation.message}</p>
              )}
            </div>

            {/* Description */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Scheme Objectives & Details *
              </label>
              <textarea
                rows={4}
                placeholder="Describe target beneficiary criteria and scheme coverage objectives..."
                {...register('description', {
                  required: 'Scheme description is required',
                  maxLength: { value: 1000, message: 'Description cannot exceed 1000 characters' }
                })}
                className="w-full rounded-lg border border-slate-200 p-3 text-sm outline-none focus:border-govBlue leading-relaxed"
              />
              {errors.description && (
                <p className="text-xs text-rose-500 mt-1 font-semibold">{errors.description.message}</p>
              )}
            </div>

            {/* Start Date */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Operational Start Date *
              </label>
              <input
                type="date"
                {...register('startDate', { required: 'Start date is required' })}
                className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-govBlue"
              />
              {errors.startDate && (
                <p className="text-xs text-rose-500 mt-1 font-semibold">{errors.startDate.message}</p>
              )}
            </div>

            {/* End Date */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Operational End Date *
              </label>
              <input
                type="date"
                {...register('endDate', {
                  required: 'End date is required',
                  validate: (value) => {
                    if (!watchStartDate) return true;
                    return new Date(value) > new Date(watchStartDate) || 'End date must be after start date';
                  }
                })}
                className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-govBlue"
              />
              {errors.endDate && (
                <p className="text-xs text-rose-500 mt-1 font-semibold">{errors.endDate.message}</p>
              )}
            </div>

            {/* Eligibility Section Title */}
            <div className="sm:col-span-2 border-t border-slate-100 pt-4 mt-2">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Eligibility Criteria Parameters</h3>
            </div>

            {/* Min & Max Age */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Minimum Age
              </label>
              <input
                type="number"
                placeholder="e.g. 18"
                {...register('minAge')}
                className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-govBlue text-slate-700 font-semibold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Maximum Age
              </label>
              <input
                type="number"
                placeholder="e.g. 60"
                {...register('maxAge')}
                className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-govBlue text-slate-700 font-semibold"
              />
            </div>

            {/* Max Annual Income & Max Grant Amount */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Maximum Annual Income (in ₹)
              </label>
              <input
                type="number"
                placeholder="e.g. 250000"
                {...register('maxAnnualIncome')}
                className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-govBlue text-slate-700 font-semibold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Maximum Grant Amount (in ₹)
              </label>
              <input
                type="number"
                placeholder="e.g. 100000"
                {...register('maxGrantAmount')}
                className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-govBlue text-slate-700 font-semibold"
              />
            </div>

            {/* Gender & Category */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Required Gender
              </label>
              <select
                {...register('gender')}
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none cursor-pointer focus:border-govBlue"
              >
                <option value="ANY">ANY</option>
                <option value="MALE">MALE</option>
                <option value="FEMALE">FEMALE</option>
                <option value="OTHER">OTHER</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Required Social Category
              </label>
              <select
                {...register('category')}
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none cursor-pointer focus:border-govBlue"
              >
                <option value="ANY">ANY</option>
                <option value="GENERAL">GENERAL</option>
                <option value="OBC">OBC</option>
                <option value="SC">SC</option>
                <option value="ST">ST</option>
                <option value="BPL">BPL</option>
              </select>
            </div>

            {/* Occupation */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Required Occupation (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Farmer, Artisan, Student"
                {...register('occupation')}
                className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-govBlue text-slate-700 font-semibold"
              />
            </div>

            {/* State & District */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Required State (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Gujarat"
                {...register('state')}
                className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-govBlue text-slate-700 font-semibold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Required District (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Gandhinagar"
                {...register('district')}
                className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-govBlue text-slate-700 font-semibold"
              />
            </div>

            {/* Required Documents */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Required Documents (Comma Separated)
              </label>
              <input
                type="text"
                placeholder="e.g. Aadhaar Card Copy, Income Certificate, Residence Certificate"
                {...register('requiredDocuments')}
                className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-govBlue text-slate-700 font-semibold"
              />
            </div>

            {/* Operational Status & Settings */}
            <div className="sm:col-span-2 border-t border-slate-100 pt-4 mt-2">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Operational parameters</h3>
            </div>

            {/* Status Select */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Operational Status *
              </label>
              <select
                {...register('status', { required: 'Status is required' })}
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none cursor-pointer focus:border-govBlue"
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
                <option value="DRAFT">DRAFT</option>
                <option value="ARCHIVED">ARCHIVED</option>
              </select>
            </div>

            {/* Active Toggle (Only in Edit mode) */}
            {isEdit && (
              <div className="flex items-center space-x-2 pt-8">
                <input
                  type="checkbox"
                  {...register('active')}
                  className="h-4.5 w-4.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-semibold text-slate-700">Scheme is active and accepting submissions</span>
              </div>
            )}
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end space-x-3 border-t border-slate-100 pt-4 mt-6">
            <Link
              to="/schemes"
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
              <span>{isEdit ? 'Save Changes' : 'Create Scheme'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
