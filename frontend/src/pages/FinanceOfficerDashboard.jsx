import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IndianRupee, Clock, CheckCircle, XCircle, AlertTriangle, RefreshCw,
  FileX, AlertCircle, ChevronLeft, Search, Filter, Eye, Download,
  FileText, User, Building2, CreditCard, Calendar, Shield, Award,
  TrendingUp, Banknote, ClipboardList, Printer, FileSpreadsheet,
  ArrowRight, Check, X, Pause, Send, Receipt, Lock
} from 'lucide-react';
import axiosInstance from '../api/axiosInstance';
import LoadingSpinner from '../components/LoadingSpinner';
import { exportApplicationsCSV } from '../api/exportHelper';
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
  const navigate = useNavigate();

  // Queue filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Pagination
  const [page, setPage] = useState(1);
  const PER_PAGE = 10;

  // Queue filters

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

  const openDetail = (app) => {
    navigate(`/verification/finance/reviews/${app.id}`);
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
      case 'daily': {
        const todayStr = new Date().toDateString();
        const list = applications.filter(a => a.workflowStatus === 'DISBURSED' && a.lastModifiedDate && new Date(a.lastModifiedDate).toDateString() === todayStr);
        exportApplicationsCSV(list, 'daily_disbursement_report');
        break;
      }
      case 'monthly': {
        const now = new Date();
        const list = applications.filter(a => {
          if (!a.lastModifiedDate) return false;
          const d = new Date(a.lastModifiedDate);
          return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        });
        exportApplicationsCSV(list, 'monthly_finance_report');
        break;
      }
      case 'pending': {
        const list = applications.filter(a => a.currentStage === 'FINANCE_REVIEW' || a.currentStage === 'FINANCE_REVIEW_PENDING');
        exportApplicationsCSV(list, 'pending_finance_payments_report');
        break;
      }
      case 'failed': {
        const list = applications.filter(a => a.workflowStatus === 'REJECTED' || a.workflowStatus === 'FINANCE_REJECTED' || a.workflowStatus === 'DISTRICT_REJECTED');
        exportApplicationsCSV(list, 'failed_finance_transactions_report');
        break;
      }
      case 'utilization': {
        const list = applications.filter(a => a.workflowStatus === 'APPROVED' || a.workflowStatus === 'DISBURSED' || a.workflowStatus === 'READY_FOR_DISBURSEMENT');
        exportApplicationsCSV(list, 'fund_utilization_report');
        break;
      }
      default:
        exportApplicationsCSV(applications, 'finance_applications_report');
        break;
    }
  };



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
