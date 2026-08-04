import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { ArrowLeft, Save, FileCheck, CheckCircle, Clock, Upload, AlertCircle } from 'lucide-react';
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
  const [selectedSchemeId, setSelectedSchemeId] = useState(preSelectedSchemeId);
  const [uploadedFiles, setUploadedFiles] = useState({});

  const {
    register,
    setValue,
    handleSubmit,
    watch,
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

  const watchedSchemeId = watch('schemeId');

  useEffect(() => {
    if (watchedSchemeId) {
      setSelectedSchemeId(watchedSchemeId);
    }
  }, [watchedSchemeId]);

  const selectedScheme = schemes.find((s) => String(s.id) === String(selectedSchemeId));

  const getRequiredDocumentsList = () => {
    if (!selectedScheme) return [];
    if (selectedScheme.requiredDocuments && selectedScheme.requiredDocuments.trim().length > 0) {
      return selectedScheme.requiredDocuments
        .split(',')
        .map((doc) => doc.trim())
        .filter((doc) => doc.length > 0);
    }
    return ['Aadhaar Card', 'Income Certificate', 'Residence Certificate', 'Bank Passbook'];
  };

  const requiredDocList = getRequiredDocumentsList();

  const handleFileChange = (docName, file) => {
    if (file) {
      setUploadedFiles((prev) => ({
        ...prev,
        [docName]: {
          file,
          fileName: file.name,
          fileSize: file.size,
          contentType: file.type || 'application/pdf',
          status: 'Uploaded'
        }
      }));
      toast.success(`${docName} attached successfully.`);
    }
  };

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
        const filterActiveSchemes = (list) => {
          const todayStr = new Date().toISOString().split('T')[0];
          return (list || []).filter(s => {
            if (!s.active || s.status !== 'ACTIVE') return false;
            if (s.startDate && s.startDate > todayStr) return false;
            if (s.endDate && s.endDate < todayStr) return false;
            return true;
          });
        };

        if (schemeRes.data && schemeRes.data.success) {
          setSchemes(filterActiveSchemes(schemeRes.data.data));
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
          setSchemes(filterActiveSchemes(schemeRes.data.data));
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
    // Validation check for mandatory required documents
    for (const reqDoc of requiredDocList) {
      if (!uploadedFiles[reqDoc] || uploadedFiles[reqDoc].status !== 'Uploaded') {
        toast.error(`Please upload ${reqDoc}.`);
        return;
      }
    }

    setSubmitting(true);
    
    // Construct payload containing document records for backend persistence
    const backendPayload = {
      beneficiaryId: Number(data.beneficiaryId),
      schemeId: Number(data.schemeId),
      requestedAmount: Number(data.requestedAmount),
      priorityTier: data.priority,
      remarks: data.remarks,
      documents: Object.entries(uploadedFiles).map(([docType, info]) => ({
        documentType: docType,
        originalFileName: info.fileName,
        storagePath: `uploads/documents/${docType.replace(/\s+/g, '_')}_${info.fileName}`,
        fileSize: info.fileSize,
        contentType: info.contentType
      }))
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
      if (err.validationErrors && err.validationErrors.length > 0) {
        err.validationErrors.forEach((error) => toast.error(error));
      } else {
        const serverMsg = err.response?.data?.data?.message || err.response?.data?.message || err.message || 'Failed to submit application.';
        toast.error(serverMsg);
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

            {/* Required Documents Section */}
            {selectedScheme && (
              <div className="sm:col-span-2 space-y-4 border-t border-slate-100 pt-5 mt-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                      <FileCheck className="h-4.5 w-4.5 text-blue-600" />
                      <span>Required Documents</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      All documents configured for <strong className="text-slate-700">{selectedScheme.name}</strong> must be uploaded before submitting.
                    </p>
                  </div>
                  <span className="text-[10px] font-bold bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full">
                    {Object.keys(uploadedFiles).filter(k => requiredDocList.includes(k)).length} / {requiredDocList.length} Uploaded
                  </span>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {requiredDocList.map((docName) => {
                    const isUploaded = uploadedFiles[docName] && uploadedFiles[docName].status === 'Uploaded';
                    const fileInfo = uploadedFiles[docName];
                    return (
                      <div key={docName} className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-blue-200 transition-all">
                        <div className="space-y-1">
                          <span className="text-xs font-bold text-slate-800 block">{docName}</span>
                          {isUploaded ? (
                            <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                              <CheckCircle className="h-3.5 w-3.5" />
                              <span>✓ Uploaded ({fileInfo.fileName})</span>
                            </span>
                          ) : (
                            <span className="text-[11px] text-amber-600 font-medium flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" />
                              <span>Pending</span>
                            </span>
                          )}
                        </div>

                        <label className={`cursor-pointer px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm ${
                          isUploaded
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}>
                          <Upload className="h-3.5 w-3.5" />
                          <span>{isUploaded ? 'Replace' : 'Choose File'}</span>
                          <input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                            className="hidden"
                            onChange={(e) => {
                              if (e.target.files && e.target.files[0]) {
                                handleFileChange(docName, e.target.files[0]);
                              }
                            }}
                          />
                        </label>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
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
