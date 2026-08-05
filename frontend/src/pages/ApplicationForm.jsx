import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import {
  ArrowLeft,
  Save,
  FileCheck,
  CheckCircle,
  Clock,
  Upload,
  AlertCircle,
  XCircle,
  ShieldCheck,
  ShieldAlert,
  IndianRupee,
  Calendar,
  Award,
  Info,
  UserCheck,
  Check,
  X,
  FileText,
  AlertTriangle,
  Loader2
} from 'lucide-react';
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
  const [selectedSchemeId, setSelectedSchemeId] = useState(preSelectedSchemeId || "");
  const [selectedScheme, setSelectedScheme] = useState(null);
  const [selectedSchemeDetails, setSelectedSchemeDetails] = useState(null);
  const [schemeDetailsLoading, setSchemeDetailsLoading] = useState(false);
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

  const watchedBeneficiaryId = watch('beneficiaryId');
  const watchedRequestedAmount = watch('requestedAmount');

  // Register schemeId in react-hook-form
  useEffect(() => {
    register('schemeId', { required: 'Scheme selection is required' });
  }, [register]);

  const handleSchemeChange = async (e) => {
    const id = e.target.value;
    setSelectedSchemeId(id);
    setValue('schemeId', id, { shouldValidate: true });

    if (!id) {
      setSelectedScheme(null);
      setSelectedSchemeDetails(null);
      return;
    }

    const selected = schemes.find((s) => String(s.id) === String(id));
    if (selected) {
      setSelectedScheme(selected);
      setSelectedSchemeDetails(selected);
    }

    setSchemeDetailsLoading(true);
    try {
      const res = await axiosInstance.get(`/v1/schemes/${id}`);
      if (res.data && res.data.success) {
        setSelectedScheme(res.data.data);
        setSelectedSchemeDetails(res.data.data);
      }
    } catch (err) {
      console.warn('Failed to fetch scheme details from API, using list fallback:', err);
    } finally {
      setSchemeDetailsLoading(false);
    }
  };

  // Automatically fetch selected scheme from URL on page load
  useEffect(() => {
    if (preSelectedSchemeId && !selectedSchemeDetails) {
      setSelectedSchemeId(preSelectedSchemeId);
      setValue('schemeId', preSelectedSchemeId, { shouldValidate: true });
      setSchemeDetailsLoading(true);
      axiosInstance.get(`/v1/schemes/${preSelectedSchemeId}`)
        .then((res) => {
          if (res.data && res.data.success) {
            setSelectedScheme(res.data.data);
            setSelectedSchemeDetails(res.data.data);
          }
        })
        .catch((err) => console.warn('Failed to fetch scheme details from URL param:', err))
        .finally(() => setSchemeDetailsLoading(false));
    }
  }, [preSelectedSchemeId, setValue]);

  // Ensure initial preSelectedSchemeId or scheme synchronization without clearing valid selection
  useEffect(() => {
    if (schemes.length > 0 && selectedSchemeId) {
      const exists = schemes.some((s) => String(s.id) === String(selectedSchemeId));
      if (!exists && !preSelectedSchemeId) {
        setSelectedSchemeId('');
        setSelectedScheme(null);
        setSelectedSchemeDetails(null);
        setValue('schemeId', '', { shouldValidate: true });
      } else if (!selectedSchemeDetails) {
        const fallback = schemes.find((s) => String(s.id) === String(selectedSchemeId));
        if (fallback) {
          setSelectedScheme(fallback);
          setSelectedSchemeDetails(fallback);
          setValue('schemeId', selectedSchemeId, { shouldValidate: true });
        }
        setSchemeDetailsLoading(true);
        axiosInstance.get(`/v1/schemes/${selectedSchemeId}`)
          .then((res) => {
            if (res.data && res.data.success) {
              setSelectedScheme(res.data.data);
              setSelectedSchemeDetails(res.data.data);
            }
          })
          .catch((err) => console.warn('Failed to fetch scheme details on init:', err))
          .finally(() => setSchemeDetailsLoading(false));
      }
    }
  }, [schemes]);

  // Identify selected beneficiary profile
  const selectedBeneficiary = beneficiaries.find(
    (b) => String(b.id) === String(watchedBeneficiaryId)
  ) || (beneficiaries.length === 1 ? beneficiaries[0] : null);

  // Age Calculation Helper
  const calculateAge = (dobString) => {
    if (!dobString) return null;
    const birthDate = new Date(dobString);
    if (isNaN(birthDate.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  // Automatic Multi-Rule Eligibility Evaluator
  const evaluateEligibility = () => {
    if (!selectedBeneficiary || !selectedSchemeDetails) return null;

    const b = selectedBeneficiary;
    const s = selectedSchemeDetails;

    const age = calculateAge(b.dateOfBirth);
    const income = Number(b.annualIncome) || 0;
    const gender = b.gender ? String(b.gender).toUpperCase() : '';
    const category = b.category ? String(b.category).toUpperCase() : '';
    const occupation = b.occupation ? String(b.occupation).toUpperCase() : '';

    const rules = [];

    // 1. Age Rule
    if (s.minAge != null || s.maxAge != null) {
      const min = s.minAge != null ? s.minAge : 0;
      const max = s.maxAge != null ? s.maxAge : 120;
      const pass = age !== null && age >= min && age <= max;
      rules.push({
        name: 'Age Criterion',
        required: `Required: ${s.minAge || 0} - ${s.maxAge || 120} years`,
        actual: age !== null ? `${age} years` : 'Not specified',
        pass,
        reason: pass
          ? 'Beneficiary age meets scheme criteria'
          : `Beneficiary age (${age || 'N/A'}) is outside allowed ${min}-${max} years`
      });
    } else {
      rules.push({
        name: 'Age Criterion',
        required: 'All Ages Eligible',
        actual: age !== null ? `${age} years` : 'N/A',
        pass: true,
        reason: 'Open to all age groups'
      });
    }

    // 2. Gender Rule
    if (s.gender && s.gender.toUpperCase() !== 'ALL' && s.gender.toUpperCase() !== 'ANY') {
      const reqGender = s.gender.toUpperCase();
      const pass = gender === reqGender;
      rules.push({
        name: 'Gender Criterion',
        required: `Required: ${reqGender}`,
        actual: gender || 'Not specified',
        pass,
        reason: pass
          ? 'Gender matches scheme target'
          : `Beneficiary gender (${gender}) does not match required ${reqGender}`
      });
    } else {
      rules.push({
        name: 'Gender Criterion',
        required: 'All Genders Eligible',
        actual: gender || 'ALL',
        pass: true,
        reason: 'Open to all genders'
      });
    }

    // 3. Maximum Income Rule
    if (s.maxAnnualIncome != null && Number(s.maxAnnualIncome) > 0) {
      const maxInc = Number(s.maxAnnualIncome);
      const pass = income <= maxInc;
      rules.push({
        name: 'Annual Income Cap',
        required: `Max Income: ₹${maxInc.toLocaleString()}`,
        actual: `₹${income.toLocaleString()}`,
        pass,
        reason: pass
          ? 'Annual income is within eligible limit'
          : `Income (₹${income.toLocaleString()}) exceeds maximum limit of ₹${maxInc.toLocaleString()}`
      });
    } else {
      rules.push({
        name: 'Annual Income Cap',
        required: 'No Income Cap Specified',
        actual: `₹${income.toLocaleString()}`,
        pass: true,
        reason: 'No income limit required'
      });
    }

    // 4. Category Rule
    if (s.category && s.category.toUpperCase() !== 'ALL' && s.category.toUpperCase() !== 'ANY') {
      const reqCat = s.category.toUpperCase();
      const pass = category === reqCat;
      rules.push({
        name: 'Category Criterion',
        required: `Required: ${reqCat}`,
        actual: category || 'Not specified',
        pass,
        reason: pass
          ? 'Category matches scheme criteria'
          : `Category (${category}) does not match required ${reqCat}`
      });
    } else {
      rules.push({
        name: 'Category Criterion',
        required: 'All Categories Eligible',
        actual: category || 'ALL',
        pass: true,
        reason: 'Open to all categories'
      });
    }

    // 5. Occupation Rule
    if (s.occupation && s.occupation.toUpperCase() !== 'ALL' && s.occupation.toUpperCase() !== 'ANY') {
      const reqOcc = s.occupation.toUpperCase();
      const pass = occupation.includes(reqOcc) || reqOcc.includes(occupation);
      rules.push({
        name: 'Occupation Criterion',
        required: `Required: ${reqOcc}`,
        actual: occupation || 'Not specified',
        pass,
        reason: pass
          ? 'Occupation matches scheme target'
          : `Occupation (${occupation}) does not match target ${reqOcc}`
      });
    } else {
      rules.push({
        name: 'Occupation Criterion',
        required: 'All Occupations Eligible',
        actual: occupation || 'ALL',
        pass: true,
        reason: 'Open to all occupations'
      });
    }

    const passedCount = rules.filter((r) => r.pass).length;
    const score = Math.round((passedCount / rules.length) * 100);
    const isEligible = rules.every((r) => r.pass);
    const failedRules = rules.filter((r) => !r.pass);

    return {
      rules,
      score,
      isEligible,
      failedReasons: failedRules.map((r) => r.reason)
    };
  };

  const evaluationResult = evaluateEligibility();

  // Extract Required Documents List
  const getRequiredDocumentsList = () => {
    if (!selectedSchemeDetails) return [];
    if (
      selectedSchemeDetails.requiredDocuments &&
      selectedSchemeDetails.requiredDocuments.trim().length > 0
    ) {
      return selectedSchemeDetails.requiredDocuments
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
          return (list || []).filter((s) => {
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
        const filterActiveSchemes = (list) => {
          const todayStr = new Date().toISOString().split('T')[0];
          return (list || []).filter((s) => {
            if (!s.active || s.status !== 'ACTIVE') return false;
            if (s.startDate && s.startDate > todayStr) return false;
            if (s.endDate && s.endDate < todayStr) return false;
            return true;
          });
        };
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

  // Validation Checks for Submission
  const maxGrant = selectedSchemeDetails?.maxGrantAmount || selectedSchemeDetails?.budgetAllocation || 0;
  const remainingBudget = selectedSchemeDetails?.remainingBudget ?? 0;
  const isBudgetExhausted = selectedSchemeDetails && remainingBudget <= 0;
  const isRequestedAmountTooHigh =
    watchedRequestedAmount && Number(watchedRequestedAmount) > Number(maxGrant) && maxGrant > 0;
  const isBeneficiaryPendingApproval =
    selectedBeneficiary &&
    selectedBeneficiary.eligibilityStatus &&
    selectedBeneficiary.eligibilityStatus !== 'VERIFIED';

  const isFormBlocked =
    !selectedSchemeDetails ||
    isBudgetExhausted ||
    isRequestedAmountTooHigh ||
    isBeneficiaryPendingApproval ||
    (evaluationResult && !evaluationResult.isEligible);

  const onSubmit = async (data) => {
    if (isFormBlocked) {
      toast.error('Cannot submit: Please resolve eligibility or form validation issues.');
      return;
    }

    // Check mandatory document uploads
    for (const reqDoc of requiredDocList) {
      if (!uploadedFiles[reqDoc] || uploadedFiles[reqDoc].status !== 'Uploaded') {
        toast.error(`Please upload ${reqDoc}.`);
        return;
      }
    }

    setSubmitting(true);

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
      const response = await axiosInstance.post('/v1/applications', backendPayload);

      if (response.data && response.data.success) {
        const createdApp = response.data.data;

        const selectedBen = selectedBeneficiary || beneficiaries.find((b) => String(b.id) === String(data.beneficiaryId));
        const selectedScheme = selectedSchemeDetails || schemes.find((s) => String(s.id) === String(data.schemeId));

        const formattedApp = {
          ...createdApp,
          remarks: data.remarks,
          beneficiary: {
            id: selectedBen.id,
            name: selectedBen.user
              ? `${selectedBen.user.firstName} ${selectedBen.user.lastName}`
              : 'Unlinked Citizen',
            uniqueIdNumber: selectedBen.uniqueIdNumber
          },
          scheme: {
            id: selectedScheme.id,
            name: selectedScheme.name,
            code: selectedScheme.code
          }
        };

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
        const serverMsg =
          err.response?.data?.data?.message ||
          err.response?.data?.message ||
          err.message ||
          'Failed to submit application.';
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
        <p className="text-center text-xs font-semibold text-slate-400 mt-4">
          Retrieving verification catalog lookups...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
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
          <h1 className="text-2xl font-black tracking-tight text-slate-800">
            Submit Subsidy Application
          </h1>
          <p className="text-slate-500 mt-1">
            Apply for direct government subsidy grants with real-time eligibility evaluation.
          </p>
        </div>
      </div>

      {/* Beneficiary Verification Status Alert Banner */}
      {selectedBeneficiary && selectedBeneficiary.eligibilityStatus !== 'VERIFIED' && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 flex items-center justify-between text-amber-900 shadow-sm">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="h-6 w-6 text-amber-600 shrink-0" />
            <div>
              <h4 className="font-bold text-sm text-amber-900">Beneficiary Registration Approval Pending</h4>
              <p className="text-xs text-amber-700 mt-0.5">
                Status: <strong className="uppercase">{selectedBeneficiary.eligibilityStatus}</strong>. Your profile must be approved by an administrator before scheme applications can be submitted.
              </p>
            </div>
          </div>
          <span className="px-3 py-1 bg-amber-200/60 text-amber-900 font-extrabold text-[10px] rounded-full uppercase">
            LOCKED
          </span>
        </div>
      )}

      {/* Main Form & Cards Grid */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Column — Application Form Inputs */}
        <div className="lg:col-span-7 space-y-6">
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm space-y-6">
            <h2 className="text-base font-bold text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              <span>Application Details</span>
            </h2>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {/* Beneficiary Select */}
              <div>
                {activeRole === 'ROLE_BENEFICIARY' ? (
                  <>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                      My Beneficiary Profile
                    </label>
                    <div className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm font-semibold text-slate-800 flex items-center justify-between">
                      <span>
                        {beneficiaries[0]
                          ? `${beneficiaries[0].user ? `${beneficiaries[0].user.firstName} ${beneficiaries[0].user.lastName}` : 'Citizen'} (${beneficiaries[0].uniqueIdNumber})`
                          : 'Loading profile...'}
                      </span>
                      <span className="text-[10px] font-extrabold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                        {beneficiaries[0]?.eligibilityStatus || 'VERIFIED'}
                      </span>
                    </div>
                    <input
                      type="hidden"
                      {...register('beneficiaryId', { required: 'Beneficiary profile is required' })}
                    />
                  </>
                ) : (
                  <>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                      Select Beneficiary *
                    </label>
                    <select
                      {...register('beneficiaryId', { required: 'Beneficiary selection is required' })}
                      className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-800 outline-none cursor-pointer focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                    >
                      <option value="">-- Choose Beneficiary --</option>
                      {beneficiaries.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.user ? `${b.user.firstName} ${b.user.lastName}` : 'Unlinked'} ({b.uniqueIdNumber} - {b.phoneNumber}) [{b.eligibilityStatus}]
                        </option>
                      ))}
                    </select>
                    {errors.beneficiaryId && (
                      <p className="text-xs text-rose-500 mt-1 font-semibold">{errors.beneficiaryId.message}</p>
                    )}
                  </>
                )}
              </div>

              {/* Scheme Select OR Read-Only Card */}
              {selectedSchemeId ? (
                <div className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50/80 to-indigo-50/40 p-5 shadow-sm space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-700 bg-blue-100 px-2.5 py-0.5 rounded-full">
                        Selected Scheme
                      </span>
                      <h3 className="text-sm font-bold text-slate-900 mt-2">
                        {selectedSchemeDetails?.name || schemes.find((s) => String(s.id) === String(selectedSchemeId))?.name || 'Loading scheme details...'}
                      </h3>
                      <p className="text-xs font-semibold text-slate-500 mt-0.5">
                        Code: <span className="text-slate-700 font-bold">{selectedSchemeDetails?.code || schemes.find((s) => String(s.id) === String(selectedSchemeId))?.code || '---'}</span>
                      </p>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                      (selectedSchemeDetails?.active !== false && selectedSchemeDetails?.status !== 'INACTIVE')
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : 'bg-rose-100 text-rose-800 border border-rose-200'
                    }`}>
                      {selectedSchemeDetails?.status || (selectedSchemeDetails?.active !== false ? 'ACTIVE' : 'INACTIVE')}
                    </span>
                  </div>
                  {(selectedSchemeDetails?.description || schemes.find((s) => String(s.id) === String(selectedSchemeId))?.description) && (
                    <p className="text-xs text-slate-600 leading-relaxed border-t border-blue-100/80 pt-2.5">
                      {selectedSchemeDetails?.description || schemes.find((s) => String(s.id) === String(selectedSchemeId))?.description}
                    </p>
                  )}
                  <input
                    type="hidden"
                    value={selectedSchemeId}
                    {...register('schemeId', { required: 'Scheme selection is required' })}
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                    Select Subsidy Scheme *
                  </label>
                  <select
                    id="schemeId"
                    value={selectedSchemeId}
                    onChange={handleSchemeChange}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-800 outline-none cursor-pointer focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                  >
                    <option value="">-- Select Government Scheme --</option>
                    {schemes.map((scheme) => (
                      <option key={scheme.id} value={scheme.id}>
                        {scheme.name} ({scheme.code})
                      </option>
                    ))}
                  </select>
                  {errors.schemeId && (
                    <p className="text-xs text-rose-500 mt-1 font-semibold">{errors.schemeId.message}</p>
                  )}
                </div>
              )}

              {/* Requested Amount & Priority Grid */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                    Requested Amount (in ₹) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-slate-400 font-bold text-sm">₹</span>
                    <input
                      type="number"
                      placeholder="e.g. 25000"
                      {...register('requestedAmount', {
                        required: 'Requested amount is required',
                        min: { value: 1, message: 'Amount must be greater than zero' }
                      })}
                      className={`h-10 w-full rounded-xl border pl-8 pr-3 text-sm outline-none font-semibold text-slate-800 ${
                        isRequestedAmountTooHigh
                          ? 'border-rose-400 bg-rose-50/50 text-rose-900 focus:border-rose-600'
                          : 'border-slate-200 focus:border-blue-600'
                      }`}
                    />
                  </div>
                  {errors.requestedAmount && (
                    <p className="text-xs text-rose-500 mt-1 font-semibold">{errors.requestedAmount.message}</p>
                  )}
                  {isRequestedAmountTooHigh && (
                    <p className="text-xs text-rose-600 mt-1 font-bold flex items-center gap-1">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      <span>Exceeds max subsidy limit of ₹{Number(maxGrant).toLocaleString()}</span>
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                    Priority Tier *
                  </label>
                  <select
                    {...register('priority', { required: 'Priority is required' })}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-800 outline-none cursor-pointer focus:border-blue-600"
                  >
                    <option value="LOW">LOW</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HIGH">HIGH</option>
                    <option value="CRITICAL">CRITICAL</option>
                  </select>
                </div>
              </div>

              {/* Remarks */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Application Purpose / Remarks
                </label>
                <textarea
                  rows={2}
                  placeholder="State subsidy purpose or supporting notes..."
                  {...register('remarks')}
                  className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-blue-600 leading-relaxed text-slate-800"
                />
              </div>

              {/* Required Documents Section */}
              {selectedSchemeDetails && (
                <div className="space-y-4 border-t border-slate-100 pt-5 mt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                        <FileCheck className="h-4 w-4 text-blue-600" />
                        <span>Required Documents</span>
                      </h3>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Upload configured verification documents for <strong className="text-slate-700">{selectedSchemeDetails.name}</strong>.
                      </p>
                    </div>
                    <span className="text-[10px] font-bold bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full border border-blue-100">
                      {Object.keys(uploadedFiles).filter((k) => requiredDocList.includes(k)).length} / {requiredDocList.length} Uploaded
                    </span>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-1">
                    {requiredDocList.map((docName) => {
                      const isUploaded = uploadedFiles[docName] && uploadedFiles[docName].status === 'Uploaded';
                      const fileInfo = uploadedFiles[docName];
                      return (
                        <div
                          key={docName}
                          className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-blue-200 transition-all"
                        >
                          <div className="space-y-0.5">
                            <span className="text-xs font-bold text-slate-800 block">{docName}</span>
                            {isUploaded ? (
                              <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                                <CheckCircle className="h-3.5 w-3.5" />
                                <span>✓ Attached ({fileInfo.fileName})</span>
                              </span>
                            ) : (
                              <span className="text-[11px] text-amber-600 font-medium flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5" />
                                <span>Not Uploaded</span>
                              </span>
                            )}
                          </div>

                          <label
                            className={`cursor-pointer px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm ${
                              isUploaded
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                                : 'bg-blue-600 text-white hover:bg-blue-700'
                            }`}
                          >
                            <Upload className="h-3.5 w-3.5" />
                            <span>{isUploaded ? 'Replace' : 'Upload'}</span>
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

              {/* Submit Buttons */}
              <div className="flex items-center justify-end space-x-3 border-t border-slate-100 pt-4 mt-6">
                <Link
                  to="/applications"
                  className="h-10 px-5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all flex items-center justify-center"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={submitting || isFormBlocked}
                  className="h-10 px-6 rounded-xl bg-blue-600 text-xs font-bold text-white hover:bg-blue-700 transition-all flex items-center justify-center space-x-2 shadow-lg shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin text-white" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  <span>Submit Application</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column — Scheme Details & Automatic Eligibility Inspection */}
        <div className="lg:col-span-5 space-y-6">
          {schemeDetailsLoading ? (
            <div className="rounded-2xl border border-slate-100 bg-white p-8 text-center space-y-3 shadow-sm">
              <LoadingSpinner size="medium" />
              <p className="text-xs text-slate-400 font-semibold">Loading scheme parameters...</p>
            </div>
          ) : selectedSchemeDetails ? (
            <>
              {/* Scheme Details Card */}
              <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm space-y-4">
                <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                      {selectedSchemeDetails.code}
                    </span>
                    <h3 className="text-base font-extrabold text-slate-800 mt-1">
                      {selectedSchemeDetails.name}
                    </h3>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 text-[10px] font-black rounded-full uppercase ${
                      selectedSchemeDetails.active && selectedSchemeDetails.status === 'ACTIVE'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}
                  >
                    {selectedSchemeDetails.status || (selectedSchemeDetails.active ? 'ACTIVE' : 'INACTIVE')}
                  </span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  {selectedSchemeDetails.description}
                </p>

                {/* Scheme Financials Grid */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-0.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Total Budget
                    </span>
                    <p className="text-sm font-black text-slate-800">
                      ₹{Number(selectedSchemeDetails.budgetAllocation || 0).toLocaleString()}
                    </p>
                  </div>

                  <div
                    className={`p-3 rounded-xl border space-y-0.5 ${
                      isBudgetExhausted
                        ? 'bg-rose-50 border-rose-200 text-rose-900'
                        : 'bg-emerald-50/50 border-emerald-100 text-emerald-900'
                    }`}
                  >
                    <span className="text-[10px] font-bold uppercase tracking-wider opacity-75">
                      Remaining Budget
                    </span>
                    <p className="text-sm font-black">
                      ₹{Number(selectedSchemeDetails.remainingBudget || 0).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-100 text-xs text-slate-600">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-semibold">Max Subsidy Benefit:</span>
                    <span className="font-extrabold text-blue-700">
                      ₹{Number(selectedSchemeDetails.maxGrantAmount || selectedSchemeDetails.budgetAllocation || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-semibold">Validity Window:</span>
                    <span className="font-bold text-slate-700">
                      {selectedSchemeDetails.startDate} to {selectedSchemeDetails.endDate}
                    </span>
                  </div>
                </div>

                {isBudgetExhausted && (
                  <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-800 font-bold flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                    <span>Scheme funds exhausted. Applications closed.</span>
                  </div>
                )}
              </div>

              {/* Automatic Eligibility Inspection Card */}
              {selectedBeneficiary && evaluationResult && (
                <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center space-x-2">
                      {evaluationResult.isEligible ? (
                        <ShieldCheck className="h-5 w-5 text-emerald-600" />
                      ) : (
                        <ShieldAlert className="h-5 w-5 text-rose-600" />
                      )}
                      <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">
                        Eligibility Score
                      </h3>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span
                        className={`text-sm font-black px-2.5 py-0.5 rounded-full ${
                          evaluationResult.isEligible
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {evaluationResult.score}% Score
                      </span>
                    </div>
                  </div>

                  {/* Rules Breakdown Table */}
                  <div className="space-y-2">
                    {evaluationResult.rules.map((rule, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 bg-slate-50/60 text-xs"
                      >
                        <div className="space-y-0.5">
                          <span className="font-bold text-slate-800 block">{rule.name}</span>
                          <span className="text-[10px] text-slate-400 block">
                            {rule.requirement} | Actual: <strong className="text-slate-700">{rule.actual}</strong>
                          </span>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase flex items-center gap-1 ${
                            rule.pass
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-rose-100 text-rose-700'
                          }`}
                        >
                          {rule.pass ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                          <span>{rule.pass ? 'PASS' : 'FAIL'}</span>
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Verdict Notification */}
                  {!evaluationResult.isEligible ? (
                    <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-800 space-y-1">
                      <p className="font-bold flex items-center gap-1.5 text-rose-900">
                        <XCircle className="h-4 w-4 text-rose-600 shrink-0" />
                        <span>Not Eligible for this Scheme</span>
                      </p>
                      <ul className="list-disc list-inside text-[11px] text-rose-700 space-y-0.5">
                        {evaluationResult.failedReasons.map((reason, i) => (
                          <li key={i}>{reason}</li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-800 font-semibold flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>Verified Eligible! You meet all scheme requirements.</span>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center space-y-2">
              <Info className="h-8 w-8 text-slate-300 mx-auto" />
              <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                No Scheme Selected
              </h4>
              <p className="text-xs text-slate-400">
                Choose a government scheme from the dropdown to view full details, budget allocation, criteria, and automatic eligibility inspection.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
