import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { ArrowLeft, Save } from 'lucide-react';
import axiosInstance from '../api/axiosInstance';
import LoadingSpinner from '../components/LoadingSpinner';
import { toast, ToastContainer } from 'react-toastify';
import { useRole } from '../layouts/ProtectedLayout';
import 'react-toastify/dist/ReactToastify.css';

export default function ApplicationForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const auth = useRole();
  const activeRole = auth ? auth.activeRole : null;

  const queryParams = new URLSearchParams(location.search);
  const preSelectedSchemeId = queryParams.get('schemeId') || '';

  const [beneficiaries, setBeneficiaries] = useState([]);
  const [schemes, setSchemes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    setValue,
    handleSubmit,
    formState: { errors }
  } = useForm({
    defaultValues: {
      beneficiaryId: '',
      schemeId: preSelectedSchemeId,
      requestedAmount: '',
      priority: 'MEDIUM',
      remarks: ''
    }
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeRole === 'ROLE_BENEFICIARY') {
        const [meRes, schemeRes] = await Promise.all([
          axiosInstance.get('/v1/beneficiaries/me'),
          axiosInstance.get('/v1/schemes')
        ]);
        if (meRes.data && meRes.data.success) {
          const profile = meRes.data.data;
          setBeneficiaries([profile]);
          setValue('beneficiaryId', profile.id);
        }
        if (schemeRes.data && schemeRes.data.success) {
          const activeSchemes = (schemeRes.data.data || []).filter(s => s.active && s.status === 'ACTIVE');
          setSchemes(activeSchemes);
        }
      } else {
        const [benRes, schemeRes] = await Promise.all([
          axiosInstance.get('/v1/beneficiaries'),
          axiosInstance.get('/v1/schemes')
        ]);
        if (benRes.data && benRes.data.success) {
          setBeneficiaries(benRes.data.data || []);
        }
        if (schemeRes.data && schemeRes.data.success) {
          const activeSchemes = (schemeRes.data.data || []).filter(s => s.active && s.status === 'ACTIVE');
          setSchemes(activeSchemes);
        }
      }
    } catch (err) {
      toast.error('Failed to load form lookup parameters.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeRole]);

  const onSubmit = async (data) => {
    setSubmitting(true);
    
    // Construct payload containing only valid Spring Boot ApplicationCreateDto fields
    const backendPayload = {
      beneficiaryId: Number(data.beneficiaryId),
      schemeId: Number(data.schemeId),
      requestedAmount: Number(data.requestedAmount),
      priorityTier: data.priority,
      remarks: data.remarks
    };

    try {
      // Call backend API to submit and persist
      const response = await axiosInstance.post('/v1/applications', backendPayload);
      
      if (response.data && response.data.success) {
        const createdApp = response.data.data;
        
        // Match names for local storage display
        const selectedBen = beneficiaries.find(b => b.id === Number(data.beneficiaryId));
        const selectedScheme = schemes.find(s => s.id === Number(data.schemeId));

        const formattedApp = {
          ...createdApp,
          remarks: data.remarks, // add remarks collected locally
          beneficiary: {
            id: selectedBen.id,
            name: selectedBen.user ? `${selectedBen.user.firstName} ${selectedBen.user.lastName}` : 'Unlinked Citizen',
            uniqueIdNumber: selectedBen.uniqueIdNumber
          },
          scheme: {
            id: selectedScheme.id,
            name: selectedScheme.name,
            code: selectedScheme.code
          }
        };

        // Append to local storage ledger list
        const ledger = JSON.parse(localStorage.getItem('applications_ledger') || '[]');
        localStorage.setItem('applications_ledger', JSON.stringify([formattedApp, ...ledger]));

        toast.success(`Application submitted successfully! App No: ${createdApp.applicationNumber}`);
        setTimeout(() => {
          navigate('/applications');
        }, 1500);
      }
    } catch (err) {
      if (err.validationErrors) {
        err.validationErrors.forEach((error) => toast.error(error));
      } else {
        toast.error(err.message || 'Failed to submit application.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-100 py-20 shadow-sm">
        <LoadingSpinner size="large" />
        <p className="text-center text-xs font-semibold text-slate-400 mt-4">Retrieving verification catalog lookups...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ToastContainer position="top-right" autoClose={3000} />

      {/* Header */}
      <div className="flex items-center space-x-4">
        <Link
          to="/applications"
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-slate-800 transition-all shadow-sm"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-800">Submit Subsidy Application</h1>
          <p className="text-slate-500 mt-1">Submit a new subsidy request on behalf of a verified beneficiary.</p>
        </div>
      </div>

      {/* Form Card */}
      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm max-w-3xl">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid gap-6 sm:grid-cols-2">
            
            {/* Beneficiary Select */}
            <div>
              {activeRole === 'ROLE_BENEFICIARY' ? (
                <>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                    My Beneficiary Profile
                  </label>
                  <div className="h-10 w-full rounded-lg border border-slate-100 bg-slate-50 px-3 text-sm font-semibold text-slate-700 flex items-center">
                    {beneficiaries[0] ? (
                      `${beneficiaries[0].user ? `${beneficiaries[0].user.firstName} ${beneficiaries[0].user.lastName}` : 'Citizen'} (${beneficiaries[0].uniqueIdNumber})`
                    ) : (
                      'Loading profile...'
                    )}
                  </div>
                  <input type="hidden" {...register('beneficiaryId', { required: 'Beneficiary profile is required' })} />
                </>
              ) : (
                <>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Select Beneficiary *
                  </label>
                  <select
                    {...register('beneficiaryId', { required: 'Beneficiary selection is required' })}
                    className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none cursor-pointer focus:border-govBlue"
                  >
                    <option value="">-- Choose Beneficiary --</option>
                    {beneficiaries.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.user ? `${b.user.firstName} ${b.user.lastName}` : 'Unlinked'} ({b.uniqueIdNumber} - {b.phoneNumber})
                      </option>
                    ))}
                  </select>
                  {errors.beneficiaryId && (
                    <p className="text-xs text-rose-500 mt-1 font-semibold">{errors.beneficiaryId.message}</p>
                  )}
                </>
              )}
            </div>

            {/* Scheme Select */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Select Subsidy Scheme *
              </label>
              <select
                {...register('schemeId', { required: 'Scheme selection is required' })}
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none cursor-pointer focus:border-govBlue"
              >
                <option value="">-- Choose Active Scheme --</option>
                {schemes.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
              {errors.schemeId && (
                <p className="text-xs text-rose-500 mt-1 font-semibold">{errors.schemeId.message}</p>
              )}
            </div>

            {/* Requested Amount */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Requested Amount (in ₹) *
              </label>
              <input
                type="number"
                placeholder="e.g. 25000"
                {...register('requestedAmount', {
                  required: 'Requested amount is required',
                  min: { value: 1, message: 'Amount must be greater than zero' }
                })}
                className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-govBlue font-semibold text-slate-700"
              />
              {errors.requestedAmount && (
                <p className="text-xs text-rose-500 mt-1 font-semibold">{errors.requestedAmount.message}</p>
              )}
            </div>

            {/* Priority */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Priority Tier *
              </label>
              <select
                {...register('priority', { required: 'Priority is required' })}
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none cursor-pointer focus:border-govBlue"
              >
                <option value="LOW">LOW</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HIGH">HIGH</option>
                <option value="CRITICAL">CRITICAL</option>
              </select>
            </div>

            {/* Remarks */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Application Remarks / Details
              </label>
              <textarea
                rows={3}
                placeholder="Provide details about subsidy requirements, land records, or purpose..."
                {...register('remarks')}
                className="w-full rounded-lg border border-slate-200 p-3 text-sm outline-none focus:border-govBlue leading-relaxed"
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end space-x-3 border-t border-slate-100 pt-4 mt-6">
            <Link
              to="/applications"
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
              <span>Submit Request</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
