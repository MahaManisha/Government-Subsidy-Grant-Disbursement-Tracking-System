import React, { useState, useEffect, useCallback } from 'react';
import {
  IndianRupee, Clock, CheckCircle, XCircle, AlertTriangle, RefreshCw,
  FileX, AlertCircle, ChevronLeft, Search, Filter, Eye, Download,
  FileText, User, Building2, CreditCard, Calendar, Shield, Award,
  TrendingUp, Banknote, ClipboardList, Printer, FileSpreadsheet,
  ArrowRight, Check, X, Pause, Send, Receipt, Lock
} from 'lucide-react';
import axiosInstance from '../api/axiosInstance';
import LoadingSpinner from '../components/LoadingSpinner';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useRole } from '../layouts/ProtectedLayout';

// ── Helpers ──────────────────────────────────────────────────────────────────
const fmtINR = (n) =>
  n != null && Number(n) !== 0
    ? `₹${Number(n).toLocaleString('en-IN')}`
    : '₹0';

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

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

function StatCard({ label, value, sub, icon: Icon, color = 'blue', loading }) {
  const colorMap = {
    blue:   'bg-blue-50 text-blue-600',
    emerald:'bg-emerald-50 text-emerald-600',
    amber:  'bg-amber-50 text-amber-500',
    rose:   'bg-rose-50 text-rose-500',
    purple: 'bg-purple-50 text-purple-600',
    teal:   'bg-teal-50 text-teal-600',
  };
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm flex items-center justify-between">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
        {loading ? (
          <div className="h-7 w-24 bg-slate-100 animate-pulse rounded mt-2" />
        ) : (
          <h3 className="text-2xl font-black text-slate-800 mt-1">{value ?? '—'}</h3>
        )}
        {!loading && sub && <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{sub}</p>}
      </div>
      <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${colorMap[color]}`}>
        <Icon className="h-6 w-6" />
      </div>
    </div>
  );
}

function EmptyState({ title, desc, onRefresh }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
      <div className="h-14 w-14 rounded-full bg-slate-100 flex items-center justify-center">
        <FileX className="h-7 w-7 text-slate-300" />
      </div>
      <div>
        <p className="text-sm font-black text-slate-700">{title}</p>
        <p className="text-xs text-slate-400 mt-1 max-w-sm">{desc}</p>
      </div>
      {onRefresh && (
        <button onClick={onRefresh} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all cursor-pointer shadow-sm">
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function FinanceOfficerDashboard() {
  const auth = useRole();
  const currentUser = auth?.user;

  // ── State ──────────────────────────────────────────────────────────────────
  const [applications, setApplications] = useState([]);
  const [disbursements, setDisbursements] = useState([]);
  const [officers, setOfficers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // View state: 'queue' | 'detail'
  const [view, setView] = useState('queue');
  const [selectedApp, setSelectedApp] = useState(null);

  // Queue filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Pagination
  const [page, setPage] = useState(1);
  const PER_PAGE = 10;

  // Action form
  const [actionType, setActionType] = useState('');  // APPROVE | REJECT | HOLD | RELEASE
  const [remarks, setRemarks] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [showActionForm, setShowActionForm] = useState(false);

  // ── Data Fetching ──────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [appsRes, disbRes, usersRes] = await Promise.all([
        axiosInstance.get('/v1/applications'),
        axiosInstance.get('/v1/disbursement-plans').catch(() => ({ data: { success: true, data: [] } })),
        axiosInstance.get('/v1/users').catch(() => ({ data: { success: true, data: [] } })),
      ]);
      if (appsRes.data?.success) setApplications(appsRes.data.data || []);
      if (disbRes.data?.success) setDisbursements(disbRes.data.data || []);
      if (usersRes.data?.success) setOfficers(usersRes.data.data || []);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to load finance data.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { setPage(1); }, [searchTerm, statusFilter]);

  // ── Derived Data ────────────────────────────────────────────────────────────
  // Finance approval queue: only applications at FINANCE_REVIEW or FINANCE_REVIEW_PENDING stage
  const financeQueue = applications.filter(a => a.currentStage === 'FINANCE_REVIEW' || a.currentStage === 'FINANCE_REVIEW_PENDING');

  // Approved by Finance
  const financeApproved = applications.filter(a =>
    a.workflowStatus === 'APPROVED' ||
    a.workflowStatus === 'READY_FOR_DISBURSEMENT' ||
    a.workflowStatus === 'DISBURSED'
  );

  // Rejected at Finance
  const financeRejected = applications.filter(a => a.workflowStatus === 'REJECTED');

  // Total funds released = sum of approved amounts for disbursed applications
  const totalReleased = applications
    .filter(a => a.workflowStatus === 'DISBURSED')
    .reduce((sum, a) => sum + Number(a.approvedAmount || 0), 0);

  // Today's releases
  const today = new Date().toDateString();
  const releasedToday = applications
    .filter(a => a.workflowStatus === 'DISBURSED' && a.lastModifiedDate && new Date(a.lastModifiedDate).toDateString() === today)
    .reduce((sum, a) => sum + Number(a.approvedAmount || 0), 0);

  // This month
  const thisMonth = new Date().getMonth();
  const thisYear = new Date().getFullYear();
  const releasedThisMonth = applications
    .filter(a => {
      if (a.workflowStatus !== 'DISBURSED' || !a.lastModifiedDate) return false;
      const d = new Date(a.lastModifiedDate);
      return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    })
    .reduce((sum, a) => sum + Number(a.approvedAmount || 0), 0);

  // Failed disbursements
  const failedDisbursements = disbursements.filter(d => d.status === 'CANCELLED' || d.status === 'FAILED').length;

  // Filtered queue for the table
  const filteredQueue = financeQueue.filter(a => {
    const term = searchTerm.toLowerCase();
    const name = a.beneficiary?.name || `${a.beneficiary?.firstName || ''} ${a.beneficiary?.lastName || ''}`.trim();
    const matches =
      (a.applicationNumber || '').toLowerCase().includes(term) ||
      name.toLowerCase().includes(term) ||
      (a.scheme?.name || '').toLowerCase().includes(term) ||
      (a.beneficiary?.district || '').toLowerCase().includes(term);
    const statusMatch = statusFilter === 'ALL' || a.workflowStatus === statusFilter;
    return matches && statusMatch;
  });

  const totalPages = Math.ceil(filteredQueue.length / PER_PAGE);
  const pageData = filteredQueue.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  // Officer ID for the logged-in finance officer
  const actingOfficer = officers.find(o => o.username === currentUser?.username);
  const actingOfficerId = actingOfficer?.id || null;

  // ── Actions ─────────────────────────────────────────────────────────────────
  const openDetail = (app) => {
    setSelectedApp(app);
    setView('detail');
    setShowActionForm(false);
    setActionType('');
    setRemarks('');
    setRejectionReason('');
  };

  const goBack = () => {
    setView('queue');
    setSelectedApp(null);
  };

  const submitFinanceAction = async () => {
    if (!remarks.trim()) {
      toast.warn('Remarks are required before submitting a decision.');
      return;
    }
    if (!actingOfficerId) {
      toast.error('Unable to resolve your officer profile. Please refresh.');
      return;
    }
    if (!selectedApp) return;

    let backendAction;
    if (actionType === 'APPROVE') backendAction = 'APPROVE';
    else if (actionType === 'REJECT') backendAction = 'REJECT';
    else if (actionType === 'HOLD') backendAction = 'REQUEST_REVERIFICATION';
    else if (actionType === 'RELEASE') backendAction = 'APPROVE';
    else { toast.error('Select a valid action.'); return; }

    const payload = {
      officerId: Number(actingOfficerId),
      action: backendAction,
      remarks,
      rejectionReason: actionType === 'REJECT' ? (rejectionReason || remarks) : null,
    };

    setSubmitting(true);
    try {
      const res = await axiosInstance.post(
        `/v1/applications/${selectedApp.id}/verification/finance-review`,
        payload
      );
      if (res.data?.success) {
        toast.success(`Finance decision "${actionType}" submitted successfully.`);
        setShowActionForm(false);
        setActionType('');
        setRemarks('');
        setRejectionReason('');
        await fetchData();
        // Refresh selected app
        const updated = await axiosInstance.get('/v1/applications');
        if (updated.data?.success) {
          const fresh = (updated.data.data || []).find(a => a.id === selectedApp.id);
          if (fresh) setSelectedApp(fresh);
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Action failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── CSV Export ─────────────────────────────────────────────────────────────
  const exportCSV = (title, rows) => {
    if (!rows.length) { toast.warn('No data available for export.'); return; }
    const csv = 'data:text/csv;charset=utf-8,' + rows.map(r => r.join(',')).join('\n');
    const link = document.createElement('a');
    link.href = encodeURI(csv);
    link.download = `${title}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`${title} exported.`);
  };

  const handleExport = (reportType) => {
    switch (reportType) {
      case 'daily':
        exportCSV('daily_disbursement', [
          ['App No.', 'Beneficiary', 'Scheme', 'Amount', 'Status', 'Date'],
          ...applications
            .filter(a => a.workflowStatus === 'DISBURSED' && a.lastModifiedDate && new Date(a.lastModifiedDate).toDateString() === today)
            .map(a => [
              a.applicationNumber,
              a.beneficiary?.name || `${a.beneficiary?.firstName || ''} ${a.beneficiary?.lastName || ''}`.trim(),
              a.scheme?.name || '',
              a.approvedAmount || 0,
              a.workflowStatus,
              fmtDate(a.lastModifiedDate),
            ]),
        ]);
        break;
      case 'monthly':
        exportCSV('monthly_finance', [
          ['App No.', 'Beneficiary', 'Scheme', 'Amount', 'Status', 'Date'],
          ...applications
            .filter(a => {
              if (!a.lastModifiedDate) return false;
              const d = new Date(a.lastModifiedDate);
              return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
            })
            .map(a => [
              a.applicationNumber,
              a.beneficiary?.name || '',
              a.scheme?.name || '',
              a.approvedAmount || 0,
              a.workflowStatus,
              fmtDate(a.lastModifiedDate),
            ]),
        ]);
        break;
      case 'pending':
        exportCSV('pending_payments', [
          ['App No.', 'Beneficiary', 'Scheme', 'Requested Amount', 'Approved Amount', 'Status'],
          ...financeQueue.map(a => [
            a.applicationNumber,
            a.beneficiary?.name || '',
            a.scheme?.name || '',
            a.requestedAmount || 0,
            a.approvedAmount || 0,
            a.workflowStatus,
          ]),
        ]);
        break;
      case 'failed':
        exportCSV('failed_transactions', [
          ['Plan ID', 'App No.', 'Status', 'Created'],
          ...disbursements
            .filter(d => d.status === 'CANCELLED' || d.status === 'FAILED')
            .map(d => [d.id, d.applicationNumber, d.status, fmtDate(d.createdAt)]),
        ]);
        break;
      case 'utilization':
        exportCSV('fund_utilization', [
          ['App No.', 'Beneficiary', 'Scheme', 'Approved Amount', 'Status'],
          ...financeApproved.map(a => [
            a.applicationNumber,
            a.beneficiary?.name || '',
            a.scheme?.name || '',
            a.approvedAmount || 0,
            a.workflowStatus,
          ]),
        ]);
        break;
      default: break;
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // DETAIL VIEW
  // ─────────────────────────────────────────────────────────────────────────
  if (view === 'detail' && selectedApp) {
    const app = selectedApp;
    const ben = app.beneficiary || {};
    const scheme = app.scheme || {};
    const isTerminal = ['APPROVED', 'DISBURSED', 'REJECTED'].includes(app.workflowStatus);

    return (
      <div className="space-y-6">
        <ToastContainer position="top-right" autoClose={3000} />

        {/* Back + Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={goBack}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all cursor-pointer shadow-sm"
          >
            <ChevronLeft className="h-4 w-4" /> Back to Queue
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
                    {ben.name || `${ben.firstName || ''} ${ben.lastName || ''}`.trim() || 'N/A'}
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

              {isTerminal ? (
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs font-semibold text-slate-500">
                  <Lock className="h-4 w-4 shrink-0" />
                  This application is in a terminal state ({app.workflowStatus?.replace(/_/g, ' ')}). No further finance actions required.
                </div>
              ) : (
                <>
                  {/* Action Buttons */}
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { type: 'APPROVE', label: 'Approve Payment', icon: Check, cls: 'bg-emerald-600 hover:bg-emerald-700 text-white' },
                      { type: 'REJECT',  label: 'Reject Payment',  icon: X,     cls: 'bg-rose-600 hover:bg-rose-700 text-white' },
                      { type: 'HOLD',    label: 'Hold Payment',    icon: Pause,  cls: 'border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-700' },
                      { type: 'RELEASE', label: 'Release Funds',   icon: Send,   cls: 'bg-blue-600 hover:bg-blue-700 text-white' },
                    ].map(({ type, label, icon: Icon, cls }) => (
                      <button
                        key={type}
                        onClick={() => { setActionType(type); setShowActionForm(true); setRemarks(''); setRejectionReason(''); }}
                        className={`flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-bold transition-all cursor-pointer shadow-sm ${cls} ${actionType === type && showActionForm ? 'ring-2 ring-offset-1 ring-blue-400' : ''}`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {label}
                      </button>
                    ))}
                  </div>

                  {/* Action Form */}
                  {showActionForm && (
                    <div className="space-y-3 border-t border-slate-100 pt-3">
                      <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                        {actionType} — Confirmation
                      </p>
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
                          className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 text-xs font-bold transition-all cursor-pointer disabled:opacity-50 shadow-sm"
                        >
                          {submitting ? <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <ArrowRight className="h-3.5 w-3.5" />}
                          {submitting ? 'Submitting…' : 'Confirm Decision'}
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
                </>
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
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // MAIN QUEUE VIEW
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <ToastContainer position="top-right" autoClose={3000} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-800">Finance Officer Workspace</h1>
          <p className="text-slate-500 mt-1 text-sm">
            Review district-approved applications, process payments, and manage fund releases.
          </p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all shadow-sm cursor-pointer self-start"
        >
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      {/* Error Banner */}
      {error && !loading && (
        <div className="flex items-center gap-3 rounded-xl border border-rose-100 bg-rose-50 p-4 text-sm font-semibold text-rose-700">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
          <button onClick={fetchData} className="ml-auto flex items-center gap-1.5 rounded-lg bg-rose-100 px-3 py-1.5 text-xs font-bold cursor-pointer hover:bg-rose-200">
            <RefreshCw className="h-3.5 w-3.5" /> Retry
          </button>
        </div>
      )}

      {/* KPI Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Pending Finance Approvals"
          value={loading ? null : financeQueue.length}
          sub={!loading && financeQueue.length === 0 ? 'No applications awaiting finance approval.' : undefined}
          icon={Clock} color="amber" loading={loading}
        />
        <StatCard
          label="Funds Ready for Release"
          value={loading ? null : fmtINR(applications.filter(a => a.workflowStatus === 'READY_FOR_DISBURSEMENT').reduce((s, a) => s + Number(a.approvedAmount || 0), 0))}
          icon={Banknote} color="blue" loading={loading}
        />
        <StatCard
          label="Amount Released Today"
          value={loading ? null : fmtINR(releasedToday)}
          sub={!loading && releasedToday === 0 ? 'No disbursements today.' : undefined}
          icon={IndianRupee} color="emerald" loading={loading}
        />
        <StatCard
          label="Amount Released This Month"
          value={loading ? null : fmtINR(releasedThisMonth)}
          sub={!loading && releasedThisMonth === 0 ? 'No disbursements this month.' : undefined}
          icon={TrendingUp} color="teal" loading={loading}
        />
        <StatCard
          label="Failed / Cancelled Transactions"
          value={loading ? null : failedDisbursements}
          sub={!loading && failedDisbursements === 0 ? 'No failed transactions.' : undefined}
          icon={AlertTriangle} color="rose" loading={loading}
        />
        <StatCard
          label="Payments Awaiting Approval"
          value={loading ? null : financeQueue.filter(a => a.workflowStatus === 'DISTRICT_APPROVED').length}
          icon={ClipboardList} color="purple" loading={loading}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">

        {/* ── Finance Approval Queue ── */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                Finance Approval Queue
                {!loading && <span className="ml-2 text-blue-600">({financeQueue.length})</span>}
              </h2>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="h-8 rounded-lg border border-slate-200 pl-8 pr-3 text-xs outline-none focus:border-blue-500 w-44"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="h-8 rounded-lg border border-slate-200 px-2 text-xs font-semibold text-slate-700 outline-none cursor-pointer focus:border-blue-500 bg-white"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="DISTRICT_APPROVED">District Approved</option>
                  <option value="FINANCE_REVIEW">Finance Review</option>
                </select>
              </div>
            </div>

            {loading ? (
              <div className="py-20 flex flex-col items-center gap-3">
                <LoadingSpinner size="large" />
                <p className="text-xs text-slate-400 font-semibold">Loading approval queue…</p>
              </div>
            ) : financeQueue.length === 0 ? (
              <EmptyState
                title="No Applications Awaiting Finance Approval"
                desc="No applications are currently at the finance review stage. Approved applications from the District Officer will appear here."
                onRefresh={fetchData}
              />
            ) : filteredQueue.length === 0 ? (
              <EmptyState
                title="No Results Match Your Filters"
                desc="Try adjusting your search term or status filter."
              />
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-xs text-slate-500">
                    <thead className="bg-slate-50 font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100">
                      <tr>
                        <th className="px-4 py-3">Application ID</th>
                        <th className="px-4 py-3">Beneficiary</th>
                        <th className="px-4 py-3">Scheme</th>
                        <th className="px-4 py-3">District</th>
                        <th className="px-4 py-3">Req. Amount</th>
                        <th className="px-4 py-3">Appr. Amount</th>
                        <th className="px-4 py-3">Bank Account</th>
                        <th className="px-4 py-3">IFSC</th>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {pageData.map(app => (
                        <tr key={app.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 font-mono font-bold text-slate-800 whitespace-nowrap">
                            {app.applicationNumber}
                          </td>
                          <td className="px-4 py-3 font-semibold text-slate-700 whitespace-nowrap">
                            {app.beneficiary?.name || `${app.beneficiary?.firstName || ''} ${app.beneficiary?.lastName || ''}`.trim() || 'N/A'}
                          </td>
                          <td className="px-4 py-3 max-w-[140px] truncate">{app.scheme?.name || 'N/A'}</td>
                          <td className="px-4 py-3">{app.beneficiary?.district || '—'}</td>
                          <td className="px-4 py-3 font-semibold text-slate-700 whitespace-nowrap">
                            {fmtINR(app.requestedAmount)}
                          </td>
                          <td className="px-4 py-3 font-semibold text-blue-700 whitespace-nowrap">
                            {fmtINR(app.approvedAmount)}
                          </td>
                          <td className="px-4 py-3 font-mono text-slate-500">
                            {maskAccount(app.beneficiary?.bankAccountNumber)}
                          </td>
                          <td className="px-4 py-3 font-mono text-slate-500">
                            {app.beneficiary?.bankIfscCode || '—'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {fmtDate(app.submittedDate)}
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge status={app.workflowStatus} />
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => openDetail(app)}
                              className="inline-flex items-center gap-1 rounded-lg bg-blue-600 hover:bg-blue-700 px-2.5 py-1.5 text-[10px] font-bold text-white transition-all cursor-pointer shadow-sm"
                            >
                              <Eye className="h-3 w-3" /> Review
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-xs font-semibold text-slate-500">
                    <span>
                      Showing {(page - 1) * PER_PAGE + 1}–{Math.min(filteredQueue.length, page * PER_PAGE)} of {filteredQueue.length}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(p => (
                        <button
                          key={p}
                          onClick={() => setPage(p)}
                          className={`px-2.5 py-1.5 rounded-lg border ${page === p ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200 hover:bg-slate-50'}`}
                        >
                          {p}
                        </button>
                      ))}
                      <button
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Recent Transactions Table */}
          <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Recent Transactions</h2>
            </div>
            {loading ? (
              <div className="py-12 flex justify-center"><LoadingSpinner size="small" /></div>
            ) : financeApproved.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-sm font-bold text-slate-600">No Disbursement Records Available</p>
                <p className="text-xs text-slate-400 mt-1">No payments have been processed yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs text-slate-500">
                  <thead className="bg-slate-50 font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100">
                    <tr>
                      <th className="px-4 py-3">Application No.</th>
                      <th className="px-4 py-3">Beneficiary</th>
                      <th className="px-4 py-3">Amount</th>
                      <th className="px-4 py-3">Release Date</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {financeApproved.slice(0, 10).map(a => (
                      <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 font-mono font-bold text-slate-800">{a.applicationNumber}</td>
                        <td className="px-4 py-3 font-semibold text-slate-700">
                          {a.beneficiary?.name || `${a.beneficiary?.firstName || ''} ${a.beneficiary?.lastName || ''}`.trim() || 'N/A'}
                        </td>
                        <td className="px-4 py-3 font-semibold text-blue-700">{fmtINR(a.approvedAmount)}</td>
                        <td className="px-4 py-3">{fmtDate(a.lastModifiedDate)}</td>
                        <td className="px-4 py-3"><StatusBadge status={a.workflowStatus} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* ── Right Panel: Reports + Quick Stats ── */}
        <div className="space-y-5">
          {/* Quick Statistics */}
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-50 pb-2">
              Finance Summary
            </h3>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-8 bg-slate-100 animate-pulse rounded" />
                ))}
              </div>
            ) : (
              <dl className="space-y-3 text-xs font-semibold">
                {[
                  { label: 'Total Approved (Finance)', value: financeApproved.length },
                  { label: 'Total Rejected', value: financeRejected.length },
                  { label: 'Pending Queue', value: financeQueue.length },
                  { label: 'Total Released', value: fmtINR(totalReleased) },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between items-center border-b border-slate-50 pb-2">
                    <dt className="text-slate-500">{label}</dt>
                    <dd className="text-slate-800 font-bold">{value}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>

          {/* Report Generation */}
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-50 pb-2">
              Generate Reports
            </h3>
            <div className="space-y-2">
              {[
                { key: 'daily',       label: 'Daily Disbursement Report',  icon: Calendar },
                { key: 'monthly',     label: 'Monthly Finance Report',     icon: FileSpreadsheet },
                { key: 'pending',     label: 'Pending Payments Report',    icon: ClipboardList },
                { key: 'failed',      label: 'Failed Transactions Report', icon: AlertTriangle },
                { key: 'utilization', label: 'Fund Utilization Report',    icon: TrendingUp },
              ].map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => handleExport(key)}
                  className="w-full flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-blue-700 hover:border-blue-200 transition-all cursor-pointer shadow-sm text-left"
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Workflow Guide */}
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">Payment Workflow</h3>
            <div className="space-y-2 text-xs font-semibold">
              {[
                { step: 'District Approved', active: false, done: true },
                { step: 'Finance Review', active: true, done: false },
                { step: 'Fund Release', active: false, done: false },
                { step: 'Disbursed', active: false, done: false },
              ].map(({ step, active, done }, i) => (
                <div key={i} className={`flex items-center gap-2 px-3 py-2 rounded-lg ${active ? 'bg-blue-50 text-blue-700 font-bold' : done ? 'text-emerald-600' : 'text-slate-400'}`}>
                  <span className={`h-2 w-2 rounded-full ${active ? 'bg-blue-500' : done ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                  {step}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
