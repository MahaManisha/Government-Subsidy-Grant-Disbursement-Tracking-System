import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Clock, Shield, Award, User, BookOpen, AlertTriangle } from 'lucide-react';
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
        
        {app.workflowStatus === 'REJECTED' ? (
          <div className="flex items-center space-x-3 p-4 rounded-xl bg-rose-50 border border-rose-100 text-rose-700">
            <AlertTriangle className="h-5 w-5" />
            <span className="font-semibold text-sm">
              This application was rejected during the `{app.currentStage?.replace(/_/g, ' ')}` stage review.
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
              const isFuture = i > currentStageIndex;

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

      {/* Details Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Left Column: Summary Card */}
        <div className="md:col-span-1 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <span
              className={`inline-flex items-center space-x-1.5 rounded-full px-3 py-1 text-xs font-bold ${
                app.workflowStatus === 'APPROVED' || app.workflowStatus === 'DISBURSED'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                  : app.workflowStatus === 'UNDER_REVIEW'
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
                <p className="text-2xl font-black text-slate-800">{app.eligibilityScore || '--'}/100</p>
                {app.eligibilityScore >= 50 ? (
                  <span className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-bold uppercase">Pass</span>
                ) : app.eligibilityScore ? (
                  <span className="text-[10px] bg-rose-50 text-rose-700 px-1.5 py-0.5 rounded font-bold uppercase">Fail</span>
                ) : null}
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
        </div>
      </div>
    </div>
  );
}
