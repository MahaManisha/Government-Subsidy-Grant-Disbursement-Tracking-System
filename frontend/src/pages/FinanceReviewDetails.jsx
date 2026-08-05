import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, User, Award, Shield, Check, X, Pause, Send, ArrowRight, Printer, Download, Lock } from 'lucide-react';
import axiosInstance from '../api/axiosInstance';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorBoundary from '../components/ErrorBoundary';
import { useRole } from '../layouts/ProtectedLayout';
import { exportApplicationsCSV } from '../api/exportHelper';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const fmtINR = (n) => n != null && Number(n) !== 0 ? `₹${Number(n).toLocaleString('en-IN')}` : '₹0';
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const maskAccount = (acc) => {
  if (!acc || acc.length < 4) return acc || '—';
  return '•'.repeat(acc.length - 4) + acc.slice(-4);
};

const STATUS_BADGE = {
  PENDING:   'bg-amber-50 text-amber-700',
  APPROVED:  'bg-emerald-50 text-emerald-700',
  RELEASED:  'bg-blue-50 text-blue-700',
  DISBURSED: 'bg-indigo-50 text-indigo-700',
  FAILED:    'bg-rose-50 text-rose-700',
  ON_HOLD:   'bg-slate-100 text-slate-600',
  CANCELLED: 'bg-rose-100 text-rose-800',
  REJECTED:  'bg-red-50 text-red-700',
  DISTRICT_APPROVED: 'bg-teal-50 text-teal-700',
  FINANCE_APPROVED: 'bg-emerald-100 text-emerald-800',
  FINANCE_REJECTED: 'bg-red-100 text-red-800',
  FINANCE_REVIEW:    'bg-purple-50 text-purple-700',
};

function StatusBadge({ status }) {
  const label = (status || 'UNKNOWN').replace(/_/g, ' ');
  const cls = STATUS_BADGE[status] || 'bg-slate-100 text-slate-500';
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${cls}`}>
      {label}
    </span>
  );
}

export default function FinanceReviewDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const auth = useRole();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [app, setApp] = useState(null);
  const [officerId, setOfficerId] = useState(null);

  // Actions state
  const [actionType, setActionType] = useState('');
  const [remarks, setRemarks] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [approvedAmount, setApprovedAmount] = useState('');
  const [showActionForm, setShowActionForm] = useState(false);

  useEffect(() => {
    if (auth?.user?.id) {
      setOfficerId(auth.user.id);
      return;
    }
    const fetchUser = async () => {
      try {
        const res = await axiosInstance.get('/v1/users/me');
        if (res.data?.success) {
          setOfficerId(res.data.data.id);
        }
      } catch (err) {
        console.error('Error fetching officer profile', err);
      }
    };
    fetchUser();
  }, [auth]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const appRes = await axiosInstance.get(`/v1/applications/${id}`);
        if (appRes.data && appRes.data.success) {
          setApp(appRes.data.data);
          setApprovedAmount(appRes.data.data.approvedAmount || appRes.data.data.requestedAmount || '');
        }
      } catch (err) {
        console.error('Failed to load application details:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const submitFinanceAction = async () => {
    if (!remarks.trim() && actionType !== 'RELEASE') {
      toast.warn('Remarks are required before submitting a decision.');
      return;
    }
    if (!officerId) {
      toast.error('Unable to resolve your officer profile. Please refresh.');
      return;
    }
    
    setSubmitting(true);
    try {
      if (actionType === 'RELEASE') {
        const res = await axiosInstance.post(`/v1/applications/${id}/verification/release-funds?officerId=${officerId}`);
        if (res.data?.success) {
          toast.success('Funds released successfully.');
          navigate('/finance/dashboard');
        }
      } else {
        let backendAction;
        if (actionType === 'APPROVE') backendAction = 'APPROVE';
        else if (actionType === 'REJECT') backendAction = 'REJECT';
        else if (actionType === 'HOLD') backendAction = 'REQUEST_REVERIFICATION';

        const payload = {
          officerId: Number(officerId),
          action: backendAction,
          remarks,
          rejectionReason: actionType === 'REJECT' ? (rejectionReason || remarks) : null,
          approvedAmount: actionType === 'APPROVE' ? Number(approvedAmount) : null
        };

        const res = await axiosInstance.post(`/v1/applications/${id}/verification/finance-review`, payload);
        if (res.data?.success) {
          toast.success(`Finance decision "${actionType}" submitted successfully.`);
          
          if (actionType === 'APPROVE') {
            // Reload the app to show "Release Funds"
            const updatedApp = await axiosInstance.get(`/v1/applications/${id}`);
            if (updatedApp.data?.success) {
              setApp(updatedApp.data.data);
            }
            setShowActionForm(false);
          } else {
             navigate('/finance/dashboard');
          }
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Action failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (!app) {
    return (
      <div className="text-center py-10">
        <h2 className="text-xl font-bold text-slate-800">Application not found</h2>
        <button onClick={() => navigate('/finance/dashboard')} className="mt-4 text-indigo-600 font-semibold hover:underline">Return to dashboard</button>
      </div>
    );
  }

  const ben = app.beneficiary || {};
  const scheme = app.scheme || {};
  const isTerminal = ['DISBURSED', 'REJECTED', 'FINANCE_REJECTED'].includes(app.workflowStatus);
  const isFinanceApproved = app.workflowStatus === 'FINANCE_APPROVED';

  return (
    <ErrorBoundary>
      <div className="space-y-6 max-w-7xl mx-auto pb-10">
        <ToastContainer position="top-right" autoClose={3000} />

        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/finance/dashboard')}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all cursor-pointer shadow-sm"
          >
            <ChevronLeft className="h-4 w-4" /> Back to Dashboard
          </button>
          <div>
            <h1 className="text-xl font-black text-slate-800">
              Finance Review — {app.applicationNumber}
            </h1>
            <p className="text-xs text-slate-400 font-semibold mt-0.5">
              Scheme: {scheme.name || 'N/A'} &nbsp;·&nbsp; Stage: {app.currentStage?.replace(/_/g, ' ') || 'N/A'}
            </p>
          </div>
          <div className="ml-auto">
            <StatusBadge status={app.workflowStatus} />
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left: Details */}
          <div className="lg:col-span-2 space-y-5">
            {/* Beneficiary Details */}
            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
              <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2 mb-4 border-b border-slate-50 pb-2">
                <User className="h-4 w-4 text-blue-500" /> Beneficiary Details
              </h3>
              <div className="grid gap-4 sm:grid-cols-2 text-sm">
                <div>
                  <p className="text-[10px] font-bold uppercase text-slate-400">Full Name</p>
                  <p className="font-semibold text-slate-800 mt-0.5">
                    {ben.user?.firstName ? `${ben.user.firstName} ${ben.user.lastName || ''}`.trim() : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase text-slate-400">Aadhaar / Unique ID</p>
                  <p className="font-semibold text-slate-800 mt-0.5 font-mono">{ben.uniqueIdNumber || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase text-slate-400">Mobile Number</p>
                  <p className="font-semibold text-slate-800 mt-0.5">{ben.phoneNumber || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase text-slate-400">District / State</p>
                  <p className="font-semibold text-slate-800 mt-0.5">
                    {[ben.district, ben.state].filter(Boolean).join(', ') || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase text-slate-400">Bank Account (Masked)</p>
                  <p className="font-semibold text-slate-800 mt-0.5 font-mono">{maskAccount(ben.bankAccountNumber)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase text-slate-400">IFSC Code</p>
                  <p className="font-semibold text-slate-800 mt-0.5 font-mono">{ben.bankIfscCode || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase text-slate-400">Annual Income</p>
                  <p className="font-semibold text-slate-800 mt-0.5">
                    {ben.annualIncome != null ? fmtINR(ben.annualIncome) : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase text-slate-400">Category</p>
                  <p className="font-semibold text-slate-800 mt-0.5">{ben.category || 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* Scheme Details */}
            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
              <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2 mb-4 border-b border-slate-50 pb-2">
                <Award className="h-4 w-4 text-purple-500" /> Scheme Details
              </h3>
              <div className="grid gap-4 sm:grid-cols-2 text-sm">
                <div>
                  <p className="text-[10px] font-bold uppercase text-slate-400">Scheme Name</p>
                  <p className="font-semibold text-slate-800 mt-0.5">{scheme.name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase text-slate-400">Scheme Code</p>
                  <p className="font-semibold text-slate-800 mt-0.5 font-mono">{scheme.code || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase text-slate-400">Budget Allocation</p>
                  <p className="font-semibold text-slate-800 mt-0.5">{fmtINR(scheme.budgetAllocation)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase text-slate-400">Remaining Budget</p>
                  <p className="font-semibold text-slate-800 mt-0.5">{fmtINR(scheme.remainingBudget)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase text-slate-400">Requested Amount</p>
                  <p className="font-semibold text-emerald-700 mt-0.5 text-base">{fmtINR(app.requestedAmount)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase text-slate-400">Approved Amount</p>
                  <p className="font-semibold text-blue-700 mt-0.5 text-base">{fmtINR(app.approvedAmount)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase text-slate-400">Eligibility Score</p>
                  <p className="font-semibold text-slate-800 mt-0.5">
                    {app.eligibilityScore != null ? `${app.eligibilityScore} / 100` : 'Not evaluated'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase text-slate-400">Eligibility Result</p>
                  <p className="font-semibold text-slate-800 mt-0.5">{app.eligibilityResult || 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* District Officer Approval Info */}
            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
              <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2 mb-4 border-b border-slate-50 pb-2">
                <Shield className="h-4 w-4 text-teal-500" /> District Officer Approval
              </h3>
              <div className="grid gap-4 sm:grid-cols-2 text-sm">
                <div>
                  <p className="text-[10px] font-bold uppercase text-slate-400">Assigned Officer</p>
                  <p className="font-semibold text-slate-800 mt-0.5">
                    {app.assignedOfficer
                      ? `${app.assignedOfficer.firstName || ''} ${app.assignedOfficer.lastName || ''}`.trim() || app.assignedOfficer.username
                      : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase text-slate-400">Approval Date</p>
                  <p className="font-semibold text-slate-800 mt-0.5">{fmtDate(app.approvedDate || app.verifiedDate)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase text-slate-400">Submitted Date</p>
                  <p className="font-semibold text-slate-800 mt-0.5">{fmtDate(app.submittedDate)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase text-slate-400">Last Updated</p>
                  <p className="font-semibold text-slate-800 mt-0.5">{fmtDate(app.lastModifiedDate)}</p>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-[10px] font-bold uppercase text-slate-400">Remarks</p>
                  <p className="font-semibold text-slate-700 mt-0.5 bg-slate-50 p-3 rounded-lg border border-slate-100 italic text-xs leading-relaxed">
                    {app.remarks || 'No remarks recorded.'}
                  </p>
                </div>
                {app.rejectionReason && (
                  <div className="sm:col-span-2">
                    <p className="text-[10px] font-bold uppercase text-slate-400">Rejection Reason</p>
                    <p className="font-semibold text-rose-700 mt-0.5 bg-rose-50 p-3 rounded-lg border border-rose-100 italic text-xs leading-relaxed">
                      {app.rejectionReason}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right: Finance Actions */}
          <div className="space-y-5">
            {/* Action Panel */}
            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider border-b border-slate-50 pb-2">
                Finance Actions
              </h3>

              {app.workflowStatus === 'DISBURSED' ? (
                <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-sm font-bold text-emerald-800 shadow-sm">
                  <Check className="h-5 w-5 shrink-0" />
                  ✓ FUNDS RELEASED
                </div>
              ) : isTerminal ? (
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs font-semibold text-slate-500">
                  <Lock className="h-4 w-4 shrink-0" />
                  This application is in a terminal state ({app.workflowStatus?.replace(/_/g, ' ')}). No further finance actions required.
                </div>
              ) : isFinanceApproved ? (
                <>
                  <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-xs font-semibold text-emerald-700 mb-2">
                    <Check className="h-4 w-4 shrink-0" />
                    Payment approved. Ready to release funds.
                  </div>
                  <button
                    onClick={() => { setActionType('RELEASE'); setShowActionForm(true); setRemarks(''); }}
                    className="w-full flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-bold transition-all cursor-pointer shadow-sm bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Send className="h-3.5 w-3.5" /> Release Funds
                  </button>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { type: 'APPROVE', label: 'Approve Payment', icon: Check, cls: 'bg-emerald-600 hover:bg-emerald-700 text-white' },
                      { type: 'REJECT',  label: 'Reject Payment',  icon: X,     cls: 'bg-rose-600 hover:bg-rose-700 text-white' },
                      { type: 'HOLD',    label: 'Hold Payment',    icon: Pause,  cls: 'border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-700' },
                    ].map(({ type, label, icon: Icon, cls }) => (
                      <button
                        key={type}
                        onClick={() => { setActionType(type); setShowActionForm(true); setRemarks(''); setRejectionReason(''); }}
                        className={`flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-bold transition-all cursor-pointer shadow-sm ${cls} ${actionType === type && showActionForm ? 'ring-2 ring-offset-1 ring-blue-400' : ''} ${type === 'HOLD' ? 'col-span-2' : ''}`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {label}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {/* Action Form */}
              {showActionForm && (
                <div className="space-y-3 border-t border-slate-100 pt-3">
                  <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                    {actionType} — Confirmation
                  </p>

                  {actionType === 'APPROVE' && (
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Approved Amount (₹)</label>
                      <input
                        type="number"
                        value={approvedAmount}
                        onChange={e => setApprovedAmount(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-xs outline-none focus:border-emerald-500 font-bold"
                      />
                    </div>
                  )}

                  {actionType !== 'RELEASE' && (
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Remarks (Required)</label>
                      <textarea
                        rows={3}
                        value={remarks}
                        onChange={e => setRemarks(e.target.value)}
                        placeholder="Enter justification for this finance decision..."
                        className="w-full rounded-lg border border-slate-200 p-2.5 text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
                      />
                    </div>
                  )}
                  {actionType === 'REJECT' && (
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Rejection Reason</label>
                      <input
                        type="text"
                        value={rejectionReason}
                        onChange={e => setRejectionReason(e.target.value)}
                        placeholder="Specific reason for rejection..."
                        className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-xs outline-none focus:border-blue-500"
                      />
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={submitFinanceAction}
                      disabled={submitting}
                      className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl text-white px-4 py-2.5 text-xs font-bold transition-all cursor-pointer disabled:opacity-50 shadow-sm ${actionType === 'APPROVE' ? 'bg-emerald-600 hover:bg-emerald-700' : actionType === 'REJECT' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                    >
                      {submitting ? <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <ArrowRight className="h-3.5 w-3.5" />}
                      {submitting ? 'Submitting…' : 'Confirm'}
                    </button>
                    <button
                      onClick={() => { setShowActionForm(false); setActionType(''); }}
                      className="rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Additional actions */}
              <div className="border-t border-slate-100 pt-3 space-y-2">
                <button
                  onClick={() => window.print()}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-slate-200 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer transition-all"
                >
                  <Printer className="h-3.5 w-3.5" /> Generate Receipt / Sanction Order
                </button>
                <button
                  onClick={() => exportCSV(`sanction_${app.applicationNumber}`, [
                    ['Field', 'Value'],
                    ['Application No.', app.applicationNumber],
                    ['Beneficiary', ben.name || `${ben.firstName || ''} ${ben.lastName || ''}`.trim()],
                    ['Scheme', scheme.name],
                    ['Approved Amount', app.approvedAmount],
                    ['Status', app.workflowStatus],
                    ['Date', fmtDate(app.lastModifiedDate)],
                  ])}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-slate-200 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer transition-all"
                >
                  <Download className="h-3.5 w-3.5" /> Download Sanction Order
                </button>
              </div>
            </div>

            {/* Payment Status Card */}
            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">Payment Status</h3>
              <StatusBadge status={app.workflowStatus} />
              <div className="mt-3 space-y-1.5 text-xs font-semibold text-slate-500">
                <div className="flex justify-between">
                  <span>Priority</span>
                  <span className="text-slate-700">{app.priority || 'MEDIUM'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Flagged</span>
                  <span className={app.isFlagged ? 'text-rose-600' : 'text-emerald-600'}>
                    {app.isFlagged ? 'Yes' : 'No'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}
