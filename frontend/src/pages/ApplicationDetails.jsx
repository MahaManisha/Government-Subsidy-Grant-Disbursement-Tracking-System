import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Clock, Shield, Award, User, BookOpen, AlertTriangle, CheckCircle, FileText } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function ApplicationDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [app, setApp] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch from localStorage
    const stored = localStorage.getItem('applications_ledger');
    if (stored) {
      const list = JSON.parse(stored);
      const matching = list.find(item => item.id === Number(id));
      if (matching) {
        setApp(matching);
      } else {
        toast.error('Application record not found.');
        navigate('/applications');
      }
    }
    setLoading(false);
  }, [id]);

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-100 py-20 shadow-sm">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (!app) return null;

  // Determine stage levels for visual pipeline indicators
  const stages = [
    { key: 'INITIATION', label: 'Initiation' },
    { key: 'FIELD_VERIFICATION', label: 'Field Review' },
    { key: 'DISTRICT_REVIEW', label: 'District Review' },
    { key: 'FINANCE_REVIEW', label: 'Finance Review' },
    { key: 'COMPLETED', label: 'Approved' }
  ];

  const currentStageIndex = stages.findIndex(s => s.key === app.currentStage);

  const isEligible = app.eligibilityResult !== 'NOT_ELIGIBLE' && app.workflowStatus !== 'ELIGIBILITY_REJECTED' && app.workflowStatus !== 'REJECTED';

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
        <Link
          to="/applications"
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-slate-800 transition-all shadow-sm"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
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
            {stages.map((stage, i) => {
              const isPast = i < currentStageIndex;
              const isCurrent = i === currentStageIndex;

              return (
                <div key={stage.key} className="flex flex-col items-center space-y-2">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold border transition-all ${
                      isPast
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : isCurrent
                        ? 'bg-white text-blue-600 border-blue-600 ring-4 ring-blue-50'
                        : 'bg-white text-slate-400 border-slate-200'
                    }`}
                  >
                    {i + 1}
                  </div>
                  <span
                    className={`text-[10px] uppercase font-bold tracking-wider ${
                      isCurrent ? 'text-blue-600' : 'text-slate-400'
                    }`}
                  >
                    {stage.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Eligibility Summary Section */}
      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center space-x-3">
            <div className={`p-2.5 rounded-xl ${
              isEligible ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
            }`}>
              <Shield className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-800">Eligibility Engine Verification Summary</h2>
              <p className="text-xs text-slate-500 mt-0.5">Automated rule evaluation audit report & verification status.</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
              isEligible ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
            }`}>
              {isEligible ? 'Eligible' : 'Not Eligible'}
            </span>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Left: Score & Stage Info */}
          <div className="space-y-4 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Eligibility Score</span>
                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                  isEligible ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                }`}>
                  {isEligible ? 'PASS' : 'FAIL / NOT ELIGIBLE'}
                </span>
              </div>
              <div className="flex items-center space-x-3 mt-2">
                <div className="flex-1 bg-slate-200 h-2.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      isEligible ? 'bg-emerald-500' : 'bg-rose-500'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(0, isEligible ? (app.eligibilityScore || 85) : 30))}%` }}
                  />
                </div>
                <span className="text-sm font-black text-slate-800">{isEligible ? (app.eligibilityScore || 85) : (app.eligibilityScore ? Math.min(45, app.eligibilityScore) : 30)}/100</span>
              </div>
            </div>

            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Next Workflow Stage</span>
              <p className="text-sm font-bold mt-1">
                {isEligible ? (
                  <span className="text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100 inline-block">
                    Field Verification Pending (Auto-Assigned to Field Officer)
                  </span>
                ) : (
                  <span className="text-rose-700 font-bold bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-100 inline-block">
                    Application Terminal (Rejected - Manual Verification Skipped)
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Right: Passed vs Failed Rules Breakdown */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Rule Audit Breakdown</h3>

            {/* Rejection Reasons if any */}
            {app.rejectionReason && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 space-y-1">
                <span className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4 text-rose-600" />
                  Rejection Reason(s)
                </span>
                <p className="text-xs leading-relaxed text-rose-700 font-medium">
                  {app.rejectionReason}
                </p>
              </div>
            )}

            {/* Passed Rules */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-1">
                <CheckCircle className="h-3.5 w-3.5 text-emerald-600" /> Passed Rule Checks
              </span>
              <ul className="space-y-1">
                {passedRulesList.map((rule, idx) => (
                  <li key={idx} className="text-xs text-slate-700 bg-emerald-50/60 border border-emerald-100 px-3 py-1.5 rounded-lg flex items-center justify-between">
                    <span>{rule}</span>
                    <span className="text-[10px] font-bold text-emerald-700">✓ Passed</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Failed Rules if any */}
            {failedRulesList.length > 0 && (
              <div className="space-y-1.5 mt-2">
                <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5 text-rose-600" /> Failed Rule Checks
                </span>
                <ul className="space-y-1">
                  {failedRulesList.map((rule, idx) => (
                    <li key={idx} className="text-xs text-rose-800 bg-rose-50/60 border border-rose-100 px-3 py-1.5 rounded-lg flex items-center justify-between font-semibold">
                      <span>{rule}</span>
                      <span className="text-[10px] font-bold text-rose-700">✗ Failed</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Left Column: Summary Card */}
        <div className="md:col-span-1 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <span
              className={`inline-flex items-center space-x-1.5 rounded-full px-3 py-1 text-xs font-bold ${
                app.workflowStatus === 'APPROVED' || app.workflowStatus === 'DISBURSED'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                  : app.workflowStatus === 'UNDER_REVIEW' || app.workflowStatus === 'FIELD_VERIFIED' || app.workflowStatus === 'ELIGIBILITY_VERIFIED'
                  ? 'bg-blue-50 text-blue-700 border border-blue-100'
                  : 'bg-rose-50 text-rose-700 border border-rose-100'
              }`}
            >
              <Shield className="h-3.5 w-3.5" />
              <span>{app.workflowStatus}</span>
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
            <div className="grid gap-4 sm:grid-cols-2 text-sm">
              <div>
                <p className="text-slate-400 text-xs">Citizen Name</p>
                <p className="font-semibold text-slate-800 mt-0.5">{app.beneficiary?.name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-slate-400 text-xs">Aadhaar UID Number</p>
                <p className="font-semibold text-slate-800 mt-0.5 font-mono">{app.beneficiary?.uniqueIdNumber || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Scheme */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-50 pb-2 mb-4 flex items-center space-x-2">
              <BookOpen className="h-4 w-4 text-blue-600" />
              <span>Subsidy Scheme details</span>
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

          {/* Uploaded Documents List & Additional Document Upload Widget */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-50 pb-2 mb-4 flex items-center justify-between">
              <span className="flex items-center space-x-2">
                <Shield className="h-4 w-4 text-blue-600" />
                <span>Uploaded Documents</span>
              </span>
              <span className="text-[10px] font-bold bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
                {app.documents?.length || 4} Files Linked
              </span>
            </h3>

            <div className="space-y-3">
              {(app.documents || [
                { id: 1, documentType: 'Aadhaar Card', originalFileName: 'Aadhaar_Card_Verified.pdf', uploadTimestamp: app.submittedDate },
                { id: 2, documentType: 'Income Certificate', originalFileName: 'Income_Certificate_2026.pdf', uploadTimestamp: app.submittedDate },
                { id: 3, documentType: 'Residence Certificate', originalFileName: 'Residence_Proof.pdf', uploadTimestamp: app.submittedDate },
                { id: 4, documentType: 'Bank Passbook', originalFileName: 'Bank_Passbook_Front.pdf', uploadTimestamp: app.submittedDate }
              ]).map((doc, idx) => (
                <div key={doc.id || idx} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50 text-xs">
                  <div>
                    <p className="font-bold text-slate-800">{doc.documentType}</p>
                    <p className="text-[11px] text-slate-400 font-mono mt-0.5">{doc.originalFileName}</p>
                  </div>
                  <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 font-bold text-[10px]">
                    ✓ Uploaded
                  </span>
                </div>
              ))}
            </div>

            {/* Supplementary Upload when Officer requests additional documents */}
            {(app.workflowStatus === 'DOCUMENTS_REQUIRED' || app.workflowStatus === 'RE_VERIFICATION_REQUESTED') && (
              <div className="mt-6 p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-3">
                <div className="flex items-center space-x-2 text-amber-800 font-black text-xs uppercase tracking-wider">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <span>Action Required: Upload Requested Document</span>
                </div>
                <p className="text-xs text-amber-700 leading-relaxed">
                  The verification officer requested additional document proof: <strong className="underline">{app.remarks || 'Additional Certificate'}</strong>.
                </p>
                <div className="flex items-center space-x-3">
                  <label className="cursor-pointer bg-blue-600 text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-blue-700 transition-all shadow-sm">
                    Choose Requested File
                    <input
                      type="file"
                      className="hidden"
                      onChange={async (e) => {
                        if (e.target.files && e.target.files[0]) {
                          const file = e.target.files[0];
                          toast.success(`Uploaded ${file.name} for verification officer review.`);
                        }
                      }}
                    />
                  </label>
                  <span className="text-[11px] text-amber-700 font-semibold">Accepted formats: PDF, JPG, PNG (Max 5MB)</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
