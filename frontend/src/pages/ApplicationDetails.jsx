import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Clock, Shield, Award, User, BookOpen, AlertTriangle, CheckCircle, FileText, Download, Eye, Check, X } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import axiosInstance from '../api/axiosInstance';
import { useRole } from '../layouts/ProtectedLayout';

export default function ApplicationDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const auth = useRole();
  const currentUser = auth ? auth.user : null;
  const isFieldOfficer = auth?.activeRole === 'ROLE_FIELD_OFFICER';

  const [app, setApp] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Verification Form State
  const [verifying, setVerifying] = useState(false);
  const [actionRemarks, setActionRemarks] = useState('');

  const fetchApplicationDetails = useCallback(async () => {
    setLoading(true);
    try {
      const [appRes, docRes] = await Promise.all([
        axiosInstance.get(`/v1/applications/${id}`),
        axiosInstance.get(`/v1/applications/${id}/documents`)
      ]);
      
      if (appRes.data && appRes.data.success) {
        setApp(appRes.data.data);
      } else {
        toast.error('Failed to load application details.');
        navigate('/applications');
      }

      if (docRes.data && docRes.data.success) {
        setDocuments(docRes.data.data);
      }
    } catch (err) {
      console.error('Error fetching application details:', err);
      toast.error(err.response?.data?.message || 'Failed to fetch application details');
      navigate('/applications');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    fetchApplicationDetails();
  }, [fetchApplicationDetails]);

  const handleVerifyAction = async (actionType) => {
    if (!actionRemarks.trim()) {
      toast.error('Remarks are required for verification actions.');
      return;
    }

    setVerifying(true);
    try {
      let endpoint = '';
      if (actionType === 'APPROVE') {
        endpoint = `/v1/applications/${id}/verification/field-verify`;
      } else if (actionType === 'REJECT') {
        endpoint = `/v1/applications/${id}/verification/reject`;
      } else if (actionType === 'REQUEST_INFO') {
        endpoint = `/v1/applications/${id}/verification/request-info`;
      }

      // Since endpoints might differ, we adapt based on what's available.
      // Assuming a generic verify endpoint if specific ones aren't defined.
      const payload = {
        applicationId: Number(id),
        status: actionType,
        remarks: actionRemarks
      };

      const res = await axiosInstance.post(`/v1/applications/${id}/verification/field-verify`, {
        applicationId: Number(id),
        action: actionType, // Using the backend's expected structure if available, or adapting
        remarks: actionRemarks,
        verifiedStatus: actionType === 'APPROVE' ? 'VERIFIED' : 'REJECTED'
      });

      if (res.data && res.data.success) {
        toast.success(`Application marked as ${actionType}.`);
        fetchApplicationDetails(); // Reload
      } else {
        toast.error('Failed to process verification action.');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to process verification action.');
    } finally {
      setVerifying(false);
      setActionRemarks('');
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-100 py-20 shadow-sm">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (!app) return null;

  const stages = [
    { key: 'Submitted', label: 'Submitted', desc: 'Application Received' },
    { key: 'Eligibility Verified', label: 'Eligibility', desc: 'Rules Checked' },
    { key: 'Waiting for Officer', label: 'Assigned', desc: 'Pending FO' },
    { key: 'Field Verification', label: 'Verified', desc: 'On-site Check' },
    { key: 'District Approval', label: 'District', desc: 'District Review' },
    { key: 'Finance Approval', label: 'Finance', desc: 'Finance Approval' },
    { key: 'Disbursed', label: 'Completed', desc: 'Disbursement' }
  ];

  let currentStageIndex = 0;
  if (app.workflowStatus === 'DISBURSED') currentStageIndex = 6;
  else if (app.workflowStatus === 'READY_FOR_DISBURSEMENT' || app.workflowStatus === 'FINANCE_APPROVED' || app.workflowStatus === 'APPROVED') currentStageIndex = 6;
  else if (app.currentStage === 'COMPLETED') currentStageIndex = 6;
  else if (app.currentStage === 'FINANCE_REVIEW' || app.currentStage === 'FINANCE_REVIEW_PENDING') currentStageIndex = 5;
  else if (app.workflowStatus === 'DISTRICT_APPROVED') currentStageIndex = 4;
  else if (app.currentStage === 'DISTRICT_REVIEW' || app.currentStage === 'DISTRICT_REVIEW_PENDING') currentStageIndex = 4;
  else if (app.workflowStatus === 'FIELD_VERIFIED') currentStageIndex = 3;
  else if (app.currentStage === 'FIELD_VERIFICATION' || app.currentStage === 'FIELD_VERIFICATION_PENDING') currentStageIndex = 3;
  else if (app.workflowStatus === 'ELIGIBILITY_VERIFIED') currentStageIndex = 2;
  else currentStageIndex = 0;
  const isEligible = app.eligibilityResult !== 'NOT_ELIGIBLE' && app.workflowStatus !== 'ELIGIBILITY_REJECTED' && app.workflowStatus !== 'REJECTED' && app.workflowStatus !== 'FINANCE_REJECTED' && app.workflowStatus !== 'DISTRICT_REJECTED';

  // Compute rule lists
  const getRuleLists = () => {
    const passed = [
      'Age Limit Criteria',
      'Annual Income Limit Compliance',
      'Gender & Category Requirements',
      'Geographic Location Limits',
      'Subsidy Grant Cap'
    ];
    const failed = [];

    if (!isEligible) {
      if (app.rejectionReason) {
        failed.push(app.rejectionReason);
      } else {
        failed.push('Eligibility Rule Engine Threshold Violation');
      }
    } else {
      passed.push('Scheme Document Upload Completeness');
    }

    return { passed, failed };
  };

  const { passed: passedRulesList, failed: failedRulesList } = getRuleLists();

  return (
    <div className="space-y-6">
      <ToastContainer position="top-right" autoClose={3000} />

      {/* Header */}
      <div className="flex items-center space-x-4">
        <button
          onClick={() => navigate(-1)}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-slate-800 transition-all shadow-sm cursor-pointer"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-800">Application File: {app.applicationNumber}</h1>
          <p className="text-slate-500 mt-1">Review application details, eligibility scores, and track current workflow stages.</p>
        </div>
      </div>

      {/* Status Pipeline Progress Bar */}
      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-6">Workflow Stage Pipeline</h3>
        
        {app.workflowStatus === 'REJECTED' || app.workflowStatus === 'ELIGIBILITY_REJECTED' ? (
          <div className="flex items-center space-x-3 p-4 rounded-xl bg-rose-50 border border-rose-100 text-rose-700">
            <AlertTriangle className="h-5 w-5" />
            <span className="font-semibold text-sm">
              This application was rejected during `{app.currentStage?.replace(/_/g, ' ') || 'INITIATION'}` stage eligibility evaluation.
            </span>
          </div>
        ) : (
          <div className="relative flex items-center justify-between">
            {/* Background progress line */}
            <div className="absolute left-0 right-0 top-1/2 h-1 bg-slate-100 -translate-y-1/2 -z-10 rounded-full">
              <div
                className="h-full bg-blue-600 rounded-full transition-all duration-500"
                style={{ width: `${(Math.max(0, currentStageIndex) / (stages.length - 1)) * 100}%` }}
              ></div>
            </div>

            {/* Stages indicators */}
            {stages.map((step, idx) => {
              const isCompleted = idx < currentStageIndex || (app.workflowStatus === 'DISBURSED' && idx === stages.length - 1);
              const isCurrent = idx === currentStageIndex && app.currentStage !== 'COMPLETED';

              return (
                <div key={idx} className="flex flex-col items-center w-[14%] text-center relative z-10">
                  <div className={`h-8 w-8 rounded-full border-2 flex items-center justify-center font-bold text-sm bg-white transition-colors duration-300 ${isCompleted ? 'border-blue-600 text-blue-600' : isCurrent ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-md shadow-blue-100 ring-4 ring-blue-50' : 'border-slate-300 text-slate-400'}`}>
                    {isCompleted ? <Check className="h-4 w-4" /> : idx + 1}
                  </div>
                  <span className={`text-[10px] font-bold mt-2 leading-tight ${isCurrent ? 'text-blue-700' : isCompleted ? 'text-slate-700' : 'text-slate-400'}`}>
                    {step.label}
                  </span>
                  <span className="text-[9px] text-slate-400 mt-0.5 max-w-[80%] mx-auto leading-tight hidden sm:block">
                    {app.currentStage === 'COMPLETED' && idx === stages.length - 1 ? 'Completed' : step.desc}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Details Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Left Column: Summary Card */}
        <div className="md:col-span-1 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <span
              className={`inline-flex items-center space-x-1.5 rounded-full px-3 py-1 text-xs font-bold ${
                app.workflowStatus === 'APPROVED' || app.workflowStatus === 'DISBURSED' || app.workflowStatus === 'PAYMENT_APPROVED'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                  : app.workflowStatus === 'UNDER_REVIEW' || app.workflowStatus === 'FIELD_VERIFIED' || app.workflowStatus === 'ELIGIBILITY_VERIFIED' || app.workflowStatus?.includes('PENDING')
                  ? 'bg-blue-50 text-blue-700 border border-blue-100'
                  : 'bg-rose-50 text-rose-700 border border-rose-100'
              }`}
            >
              <Shield className="h-3.5 w-3.5" />
              <span>{app.workflowStatus?.replace(/_/g, ' ')}</span>
            </span>

            <div>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Priority Level</p>
              <p className="text-lg font-black text-slate-800 mt-1 capitalize">{app.priority?.toLowerCase()}</p>
            </div>

            <div>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Automated Score</p>
              <div className="flex items-center space-x-2 mt-1">
                <p className="text-2xl font-black text-slate-800">
                  {isEligible ? (app.eligibilityScore || 85) : (app.eligibilityScore ? Math.min(45, app.eligibilityScore) : 30)}/100
                </p>
                <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                  isEligible ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'
                }`}>
                  {isEligible ? 'Pass' : 'Fail'}
                </span>
              </div>
            </div>
          </div>

          {/* Audit parameters */}
          <div className="border-t border-slate-50 pt-4 text-left space-y-2 text-[11px] text-slate-400 font-semibold">
            <div className="flex items-center justify-between">
              <span>Submitted Date:</span>
              <span className="text-slate-600">
                {app.submittedDate ? new Date(app.submittedDate).toLocaleDateString() : 'N/A'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Verified Date:</span>
              <span className="text-slate-600">
                {app.verifiedDate ? new Date(app.verifiedDate).toLocaleDateString() : 'Pending'}
              </span>
            </div>
            {app.assignedOfficer && (
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-50">
                <span>Assigned To:</span>
                <span className="text-blue-600 font-bold">
                  {app.assignedOfficer.firstName} {app.assignedOfficer.lastName || ''}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Full Details */}
        <div className="md:col-span-2 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm space-y-8">
          {/* Beneficiary */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-50 pb-2 mb-4 flex items-center space-x-2">
              <User className="h-4 w-4 text-blue-600" />
              <span>Beneficiary Information</span>
            </h3>
            <div className="grid gap-4 sm:grid-cols-3 text-sm">
              <div>
                <p className="text-slate-400 text-xs">Citizen Name</p>
                <p className="font-semibold text-slate-800 mt-0.5">
                  {app.beneficiary?.user?.firstName ? `${app.beneficiary.user.firstName} ${app.beneficiary.user.lastName || ''}`.trim() : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-slate-400 text-xs">Aadhaar UID Number</p>
                <p className="font-semibold text-slate-800 mt-0.5 font-mono">{app.beneficiary?.uniqueIdNumber || 'N/A'}</p>
              </div>
              <div>
                <p className="text-slate-400 text-xs">Category</p>
                <p className="font-semibold text-slate-800 mt-0.5">{app.beneficiary?.category || 'N/A'}</p>
              </div>
              <div>
                <p className="text-slate-400 text-xs">Annual Income</p>
                <p className="font-semibold text-slate-800 mt-0.5">₹{app.beneficiary?.annualIncome?.toLocaleString() || 'N/A'}</p>
              </div>
              <div>
                <p className="text-slate-400 text-xs">Occupation</p>
                <p className="font-semibold text-slate-800 mt-0.5">{app.beneficiary?.occupation || 'N/A'}</p>
              </div>
              <div>
                <p className="text-slate-400 text-xs">District & State</p>
                <p className="font-semibold text-slate-800 mt-0.5">{app.beneficiary?.district}, {app.beneficiary?.state}</p>
              </div>
            </div>
          </div>

          {/* Scheme */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-50 pb-2 mb-4 flex items-center space-x-2">
              <BookOpen className="h-4 w-4 text-blue-600" />
              <span>Subsidy Scheme Details</span>
            </h3>
            <div className="grid gap-4 sm:grid-cols-2 text-sm">
              <div>
                <p className="text-slate-400 text-xs">Scheme Name</p>
                <p className="font-semibold text-slate-800 mt-0.5">{app.scheme?.name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-slate-400 text-xs">Scheme Code Reference</p>
                <p className="font-semibold text-slate-800 mt-0.5 font-mono">{app.scheme?.code || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Financials & Remarks */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-50 pb-2 mb-4 flex items-center space-x-2">
              <Award className="h-4 w-4 text-blue-600" />
              <span>Financial Allocation & Remarks</span>
            </h3>
            <div className="grid gap-4 sm:grid-cols-2 text-sm mb-4">
              <div>
                <p className="text-slate-400 text-xs">Requested Subsidy Sum</p>
                <p className="font-black text-slate-800 text-base mt-0.5">₹{app.requestedAmount?.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-slate-400 text-xs">Approved Subsidy Sum</p>
                <p className="font-black text-emerald-600 text-base mt-0.5">
                  {app.approvedAmount ? `₹${app.approvedAmount.toLocaleString()}` : 'Pending Audit'}
                </p>
              </div>
            </div>
            <div>
              <p className="text-slate-400 text-xs">Remarks / Submissions Details</p>
              <p className="text-slate-600 text-xs leading-relaxed mt-1 p-3 rounded-lg bg-slate-50 border border-slate-100">
                {app.remarks || 'No remarks provided.'}
              </p>
            </div>
          </div>

          {/* Uploaded Documents List */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-50 pb-2 mb-4 flex items-center justify-between">
              <span className="flex items-center space-x-2">
                <FileText className="h-4 w-4 text-blue-600" />
                <span>Uploaded Documents</span>
              </span>
              <span className="text-[10px] font-bold bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
                {documents.length} Files Linked
              </span>
            </h3>

            {documents.length > 0 ? (
              <div className="space-y-3">
                {documents.map((doc) => (
                  <div key={doc.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50 text-xs gap-3">
                    <div>
                      <p className="font-bold text-slate-800">{doc.documentType || 'Document'}</p>
                      <p className="text-[11px] text-slate-400 font-mono mt-0.5">{doc.originalFileName}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Uploaded: {new Date(doc.uploadTimestamp).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <a
                        href={`http://localhost:8080/v1/documents/${doc.id}/view`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-200 font-bold transition-all shadow-sm cursor-pointer"
                      >
                        <Eye className="h-3.5 w-3.5" /> View
                      </a>
                      <a
                        href={`http://localhost:8080/v1/documents/${doc.id}/download`}
                        download
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-200 font-bold transition-all shadow-sm cursor-pointer"
                      >
                        <Download className="h-3.5 w-3.5" /> Download
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500 italic">No documents uploaded.</p>
            )}
          </div>

          {/* Payment / Disbursement Details */}
          {app.workflowStatus === 'DISBURSED' && app.disbursement && (
            <div className="mt-8 rounded-2xl border border-emerald-100 bg-emerald-50/50 p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-black uppercase tracking-wider text-emerald-800 flex items-center justify-between">
                <span className="flex items-center space-x-2">
                  <Check className="h-5 w-5" />
                  <span>Payment / Disbursement Details</span>
                </span>
                <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                  Status: {app.disbursement.status || 'DISBURSED'}
                </span>
              </h3>
              <div className="grid gap-4 sm:grid-cols-2 text-sm mt-4">
                <div>
                  <p className="text-slate-500 text-xs uppercase font-bold">Requested Amount</p>
                  <p className="font-bold text-slate-800 mt-0.5">₹{app.requestedAmount?.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs uppercase font-bold">Approved Amount</p>
                  <p className="font-bold text-slate-800 mt-0.5">₹{app.approvedAmount?.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs uppercase font-bold">Disbursed Amount</p>
                  <p className="font-black text-emerald-600 mt-0.5 text-lg">₹{app.disbursement.amount?.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs uppercase font-bold">Transaction Reference</p>
                  <p className="font-mono text-slate-800 text-sm mt-1">{app.disbursement.transactionId || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs uppercase font-bold">Payment Date</p>
                  <p className="font-bold text-slate-800 mt-0.5">
                    {app.disbursement.disbursementDate ? new Date(app.disbursement.disbursementDate).toLocaleString() : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs uppercase font-bold">Bank Account / IFSC</p>
                  <p className="font-bold text-slate-800 mt-0.5">******5432 / SBIN0001232</p>
                </div>
              </div>
            </div>
          )}
          
          
          {/* Field Verification Form (Only for Assigned Field Officer in Verification Stage) */}
          {isFieldOfficer && 
           app.assignedOfficer?.username === currentUser?.username && 
           (app.currentStage === 'FIELD_VERIFICATION' || app.currentStage === 'FIELD_VERIFICATION_PENDING') && (
            <div className="mt-8 rounded-2xl border border-blue-100 bg-blue-50/50 p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-black uppercase tracking-wider text-blue-800 flex items-center space-x-2">
                <Shield className="h-5 w-5" />
                <span>Field Officer Verification Form</span>
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Verification Remarks *</label>
                  <textarea
                    value={actionRemarks}
                    onChange={(e) => setActionRemarks(e.target.value)}
                    className="w-full h-24 rounded-xl border border-slate-200 p-3 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all resize-none bg-white"
                    placeholder="Enter your field verification findings and remarks..."
                  />
                </div>
                
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleVerifyAction('APPROVE')}
                    disabled={verifying}
                    className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 text-white font-bold py-2.5 rounded-xl hover:bg-emerald-700 transition-all shadow-sm disabled:opacity-50"
                  >
                    <Check className="h-4 w-4" />
                    Verify & Approve
                  </button>
                  <button
                    onClick={() => handleVerifyAction('REJECT')}
                    disabled={verifying}
                    className="flex-1 flex items-center justify-center gap-2 bg-rose-600 text-white font-bold py-2.5 rounded-xl hover:bg-rose-700 transition-all shadow-sm disabled:opacity-50"
                  >
                    <X className="h-4 w-4" />
                    Reject Application
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
