import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Search, Plus, Filter, Eye, RefreshCw, FileX } from 'lucide-react';
import { ToastContainer, toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner';
import 'react-toastify/dist/ReactToastify.css';
import axiosInstance from '../api/axiosInstance';
import { useRole } from '../layouts/ProtectedLayout';

export default function ApplicationList({ filterSelf, filterAssigned }) {
  const auth = useRole();
  const currentUser = auth ? auth.user : null;

  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // -----------------------------------------------------------------------
  // Fetch all applications from the real backend API
  // -----------------------------------------------------------------------
  const fetchApplications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const endpoint = filterSelf ? '/v1/applications/my' : '/v1/applications';
      const response = await axiosInstance.get(endpoint);
      if (response.data && response.data.success && Array.isArray(response.data.data)) {
        setApplications(response.data.data);
      } else {
        const stored = localStorage.getItem('applications_ledger');
        setApplications(stored ? JSON.parse(stored) : []);
      }
    } catch (err) {
      console.error('Failed to load applications from API, attempting local fallback:', err);
      const stored = localStorage.getItem('applications_ledger');
      if (stored) {
        setApplications(JSON.parse(stored));
        setError(null);
      } else {
        const msg = err.response?.data?.message || err.message || 'Failed to load applications.';
        setError(msg);
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  }, [filterSelf]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  // -----------------------------------------------------------------------
  // Filter logic — no hardcoded names or usernames
  // -----------------------------------------------------------------------
  const filtered = applications.filter(a => {
    const benName = a.beneficiary
      ? (a.beneficiary.name || `${a.beneficiary.firstName || ''} ${a.beneficiary.lastName || ''}`.trim())
      : '';
    const schemeName = a.scheme ? (a.scheme.name || '') : '';
    const appNo = a.applicationNumber || '';

    const term = searchTerm.toLowerCase();
    const matchesSearch =
      benName.toLowerCase().includes(term) ||
      schemeName.toLowerCase().includes(term) ||
      appNo.toLowerCase().includes(term);

    const matchesStatus = statusFilter === 'ALL' || a.workflowStatus === statusFilter;

    // Beneficiary self-view: show all applications belonging to the logged-in beneficiary
    if (filterSelf) {
      return matchesSearch && matchesStatus;
    }

    // Field Officer view: show only applications assigned to this officer in FIELD_VERIFICATION stage
    if (filterAssigned) {
      const officerUsername = a.assignedOfficer?.username;
      const isAssigned = officerUsername && currentUser?.username && officerUsername === currentUser.username;
      const isFieldStage = a.currentStage === 'FIELD_VERIFICATION' || a.currentStage === 'FIELD_VERIFICATION_PENDING';
      return matchesSearch && matchesStatus && !!isAssigned && isFieldStage;
    }

    return matchesSearch && matchesStatus;
  });

  // Pagination
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginatedData = filtered.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // -----------------------------------------------------------------------
  // Status badge colour helper
  // -----------------------------------------------------------------------
  const statusColour = (status) => {
    switch (status) {
      case 'APPROVED':
      case 'DISBURSED':
      case 'PAYMENT_APPROVED':
        return 'bg-emerald-50 text-emerald-700';
      case 'UNDER_REVIEW':
      case 'SUBMITTED':
      case 'DISTRICT_REVIEW_PENDING':
      case 'FINANCE_REVIEW_PENDING':
      case 'FIELD_VERIFICATION_PENDING':
        return 'bg-blue-50 text-blue-700';
      case 'READY_FOR_DISBURSEMENT':
        return 'bg-indigo-50 text-indigo-700';
      case 'FIELD_VERIFIED':
      case 'DISTRICT_APPROVED':
        return 'bg-teal-50 text-teal-700';
      case 'RE_VERIFICATION_REQUESTED':
      case 'CORRECTION_REQUIRED':
      case 'FIELD_REVERIFICATION_REQUIRED':
      case 'DOCUMENTS_REQUESTED':
      case 'DOCUMENTS_REQUIRED':
        return 'bg-amber-50 text-amber-700';
      case 'REJECTED':
      case 'FIELD_REJECTED':
      case 'DISTRICT_REJECTED':
      case 'FINANCE_REJECTED':
        return 'bg-rose-50 text-rose-700';
      default:
        return 'bg-slate-100 text-slate-600';
    }
  };

  const pageTitle = filterAssigned ? 'Assigned Applications' : 'Subsidy Applications';
  const pageDesc = filterAssigned
    ? 'Applications assigned to you for field verification.'
    : 'Review application details, eligibility scores, and track workflow stages.';

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------
  return (
    <div className="space-y-6">
      <ToastContainer position="top-right" autoClose={3000} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-800">{pageTitle}</h1>
          <p className="text-slate-500 mt-1 text-sm">{pageDesc}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchApplications}
            title="Refresh"
            className="flex h-10 items-center justify-center space-x-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all shadow-sm cursor-pointer"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Refresh</span>
          </button>
          {!filterAssigned && (
            <Link
              to="/applications/add"
              className="flex h-10 items-center justify-center space-x-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 transition-all shadow-sm"
            >
              <Plus className="h-4 w-4" />
              <span>Submit Application</span>
            </Link>
          )}
        </div>
      </div>

      {/* Search & Filters */}
      <div className="grid gap-4 md:grid-cols-2 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by App No, Beneficiary, or Scheme..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-10 w-full rounded-lg border border-slate-200 pl-10 pr-4 text-sm outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div className="flex items-center space-x-2">
          <Filter className="h-4.5 w-4.5 text-slate-400 shrink-0" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none cursor-pointer focus:border-blue-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="SUBMITTED">SUBMITTED</option>
            <option value="UNDER_REVIEW">UNDER REVIEW</option>
            <option value="FIELD_VERIFIED">FIELD VERIFIED</option>
            <option value="APPROVED">APPROVED</option>
            <option value="READY_FOR_DISBURSEMENT">READY FOR DISBURSEMENT</option>
            <option value="DISBURSED">DISBURSED</option>
            <option value="RE_VERIFICATION_REQUESTED">RE-VERIFICATION REQUESTED</option>
            <option value="CORRECTION_REQUIRED">CORRECTION REQUIRED</option>
            <option value="REJECTED">REJECTED</option>
          </select>
        </div>
      </div>

      {/* Applications Table */}
      {loading ? (
        <div className="bg-white rounded-xl border border-slate-100 py-24 shadow-sm flex flex-col items-center justify-center gap-3">
          <LoadingSpinner size="large" />
          <p className="text-sm text-slate-400 font-semibold">Loading applications from database…</p>
        </div>
      ) : error ? (
        <div className="bg-white rounded-xl border border-rose-100 py-20 shadow-sm flex flex-col items-center justify-center gap-4 text-center px-4">
          <div className="h-14 w-14 rounded-full bg-rose-50 flex items-center justify-center">
            <FileX className="h-7 w-7 text-rose-400" />
          </div>
          <div>
            <p className="text-base font-black text-slate-800">Failed to Load Applications</p>
            <p className="text-sm text-slate-400 mt-1">{error}</p>
          </div>
          <button
            onClick={fetchApplications}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-sm font-bold text-white hover:bg-blue-700 transition-all cursor-pointer"
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm text-slate-500">
                <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4">Application No.</th>
                    <th className="px-6 py-4">Beneficiary</th>
                    <th className="px-6 py-4">Scheme</th>
                    <th className="px-6 py-4">Requested Amt</th>
                    <th className="px-6 py-4">Approved Amt</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Stage</th>
                    <th className="px-6 py-4">Submitted</th>
                    <th className="px-6 py-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedData.length > 0 ? (
                    paginatedData.map((a) => (
                      <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-mono font-bold text-slate-800 whitespace-nowrap">
                          {a.applicationNumber}
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-0.5">
                            <p className="font-semibold text-slate-800 whitespace-nowrap">
                              {a.beneficiary?.name ||
                                `${a.beneficiary?.firstName || ''} ${a.beneficiary?.lastName || ''}`.trim() ||
                                'N/A'}
                            </p>
                            <p className="text-[10px] text-slate-400 font-mono">
                              UID: {a.beneficiary?.uniqueIdNumber || 'N/A'}
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-0.5">
                            <p className="font-semibold text-slate-800 max-w-[180px] truncate">
                              {a.scheme?.name || 'N/A'}
                            </p>
                            {a.scheme?.code && (
                              <p className="text-[10px] text-slate-400 font-mono">
                                {a.scheme.code}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 font-semibold text-slate-700 whitespace-nowrap">
                          {a.requestedAmount != null ? `₹${Number(a.requestedAmount).toLocaleString()}` : '--'}
                        </td>
                        <td className="px-6 py-4 font-semibold text-slate-700 whitespace-nowrap">
                          {a.approvedAmount != null ? `₹${Number(a.approvedAmount).toLocaleString()}` : '--'}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider whitespace-nowrap ${statusColour(a.workflowStatus)}`}>
                            {a.workflowStatus?.replace(/_/g, ' ') || 'N/A'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs font-semibold text-slate-600 whitespace-nowrap">
                          {a.currentStage?.replace(/_/g, ' ') || 'N/A'}
                        </td>
                        <td className="px-6 py-4 text-xs whitespace-nowrap">
                          {a.submittedDate
                            ? new Date(a.submittedDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                            : 'N/A'}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Link
                            to={`/applications/${a.id}`}
                            className="inline-flex items-center rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-all"
                            title="View Details"
                          >
                            <Eye className="h-4.5 w-4.5" />
                          </Link>
                        </td>
                      </tr>
                    ))
                  ) : (
                    /* Empty state — shown when DB has no matching records */
                    <tr>
                      <td colSpan={9}>
                        <div className="flex flex-col items-center justify-center py-20 px-6 text-center gap-4">
                          <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center">
                            <FileX className="h-8 w-8 text-slate-300" />
                          </div>
                          <div>
                            <p className="text-base font-black text-slate-700">
                              {filterAssigned
                                ? 'No Assigned Applications Found'
                                : 'No Applications Found'}
                            </p>
                            <p className="text-sm text-slate-400 mt-1 max-w-xs">
                              {filterAssigned
                                ? 'You currently have no applications pending field verification. New assignments will appear here automatically.'
                                : searchTerm || statusFilter !== 'ALL'
                                  ? 'No records match your current search or filter criteria. Try adjusting your search.'
                                  : 'No subsidy applications exist in the system yet.'}
                            </p>
                          </div>
                          <button
                            onClick={fetchApplications}
                            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all cursor-pointer shadow-sm"
                          >
                            <RefreshCw className="h-4 w-4" />
                            Refresh
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-100 pt-4 px-4 text-xs font-semibold text-slate-500">
              <p>
                Showing {Math.min(filtered.length, (currentPage - 1) * itemsPerPage + 1)}–
                {Math.min(filtered.length, currentPage * itemsPerPage)} of {filtered.length} records
              </p>
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  Previous
                </button>
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-1.5 rounded-lg border transition-all ${
                      currentPage === page
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
