import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Search, Plus, Filter, UserCheck, ShieldAlert, Trash2, Edit3, Eye, AlertTriangle, X, Loader2, CheckCircle2, XCircle, MessageSquare, Clock } from 'lucide-react';
import axiosInstance from '../api/axiosInstance';
import LoadingSpinner from '../components/LoadingSpinner';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function BeneficiaryList() {
  const navigate = useNavigate();
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchAadhaar, setSearchAadhaar] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Modal states for Approval Workflow
  const [confirmApproveBen, setConfirmApproveBen] = useState(null);
  const [confirmRejectBen, setConfirmRejectBen] = useState(null);
  const [confirmRequestChangesBen, setConfirmRequestChangesBen] = useState(null);
  const [approvalRemarks, setApprovalRemarks] = useState('');
  const [actionSubmitting, setActionSubmitting] = useState(false);

  // Fetch all beneficiaries
  const fetchBeneficiaries = async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.get('/v1/beneficiaries');
      if (response.data && response.data.success) {
        setBeneficiaries(response.data.data || []);
      } else {
        setBeneficiaries([]);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to load beneficiaries.', { toastId: 'fetch-beneficiaries-error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBeneficiaries();
  }, []);

  const [confirmDeleteBen, setConfirmDeleteBen] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const promptDelete = (id, name) => {
    setConfirmDeleteBen({ id, name });
  };

  const handleDeleteConfirmed = async () => {
    if (!confirmDeleteBen) return;
    const { id, name } = confirmDeleteBen;
    setDeleting(true);

    try {
      const response = await axiosInstance.delete(`/v1/beneficiaries/${id}`);
      if (response.data && response.data.success) {
        toast.success('Beneficiary deleted successfully.');
        setConfirmDeleteBen(null);
        fetchBeneficiaries();
      } else {
        toast.error(response.data?.message || 'Failed to delete beneficiary.');
      }
    } catch (err) {
      const status = err.status || err.response?.status;
      if (status === 409) {
        toast.error(err.message || 'This beneficiary cannot be permanently deleted because application or verification records exist.', { autoClose: 5000 });
      } else if (status === 404) {
        toast.error('Beneficiary not found.');
      } else if (status === 403) {
        toast.error('You do not have permission to delete beneficiaries.');
      } else if (status === 500) {
        toast.error('Unable to delete beneficiary due to a server error.');
      } else if (!status && !err.response) {
        toast.error('Unable to connect to the server.');
      } else {
        toast.error(err.message || 'Failed to delete beneficiary.');
      }
      setConfirmDeleteBen(null);
    } finally {
      setDeleting(false);
    }
  };

  const handleApproveConfirmed = async () => {
    if (!confirmApproveBen) return;
    setActionSubmitting(true);
    try {
      const response = await axiosInstance.put(`/v1/beneficiaries/${confirmApproveBen.id}/approve`, {
        remarks: approvalRemarks
      });
      if (response.data && response.data.success) {
        toast.success(`Beneficiary "${confirmApproveBen.name}" approved successfully!`);
        setBeneficiaries(prev => prev.map(b => b.id === confirmApproveBen.id ? { ...b, eligibilityStatus: 'VERIFIED', approvalRemarks } : b));
        setConfirmApproveBen(null);
        setApprovalRemarks('');
      } else {
        toast.error(response.data?.message || 'Failed to approve beneficiary.');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to approve beneficiary.');
    } finally {
      setActionSubmitting(false);
    }
  };

  const handleRejectConfirmed = async () => {
    if (!confirmRejectBen) return;
    if (!approvalRemarks.trim()) {
      toast.error('Rejection reason is required.');
      return;
    }
    setActionSubmitting(true);
    try {
      const response = await axiosInstance.put(`/v1/beneficiaries/${confirmRejectBen.id}/reject`, {
        reason: approvalRemarks
      });
      if (response.data && response.data.success) {
        toast.success(`Beneficiary "${confirmRejectBen.name}" rejected.`);
        setBeneficiaries(prev => prev.map(b => b.id === confirmRejectBen.id ? { ...b, eligibilityStatus: 'REJECTED', rejectionReason: approvalRemarks } : b));
        setConfirmRejectBen(null);
        setApprovalRemarks('');
      } else {
        toast.error(response.data?.message || 'Failed to reject beneficiary.');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to reject beneficiary.');
    } finally {
      setActionSubmitting(false);
    }
  };

  const handleRequestChangesConfirmed = async () => {
    if (!confirmRequestChangesBen) return;
    if (!approvalRemarks.trim()) {
      toast.error('Remarks detailing requested changes are required.');
      return;
    }
    setActionSubmitting(true);
    try {
      const response = await axiosInstance.put(`/v1/beneficiaries/${confirmRequestChangesBen.id}/request-changes`, {
        remarks: approvalRemarks
      });
      if (response.data && response.data.success) {
        toast.success(`Changes requested for "${confirmRequestChangesBen.name}".`);
        setBeneficiaries(prev => prev.map(b => b.id === confirmRequestChangesBen.id ? { ...b, eligibilityStatus: 'CHANGES_REQUIRED', approvalRemarks } : b));
        setConfirmRequestChangesBen(null);
        setApprovalRemarks('');
      } else {
        toast.error(response.data?.message || 'Failed to request changes.');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to request changes.');
    } finally {
      setActionSubmitting(false);
    }
  };

  // Filter logic
  const filtered = beneficiaries.filter(b => {
    // Search Name in user profile (firstName, lastName, username)
    let fullName = '';
    if (b.user) {
      fullName = `${b.user.firstName || ''} ${b.user.lastName || ''} ${b.user.username || ''}`.toLowerCase();
    }
    const matchesName = fullName.includes(searchTerm.toLowerCase());
    
    // Search Aadhaar
    const matchesAadhaar = b.uniqueIdNumber ? b.uniqueIdNumber.includes(searchAadhaar) : true;
    
    // Filter Category
    const matchesCategory = categoryFilter === 'ALL' || b.category === categoryFilter;

    return matchesName && matchesAadhaar && matchesCategory;
  });

  // Pagination calculations
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginatedData = filtered.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, searchAadhaar, categoryFilter]);

  return (
    <div className="space-y-6">
      <ToastContainer position="top-right" autoClose={3000} />
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-800">Beneficiary Register</h1>
          <p className="text-slate-500 mt-1">Manage and audit target citizen profiles registered under the subsidy program.</p>
        </div>
        <Link
          to="/beneficiaries/add"
          className="flex h-10 items-center justify-center space-x-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 transition-all shadow-sm"
        >
          <Plus className="h-4 w-4" />
          <span>Add Beneficiary</span>
        </Link>
      </div>

      {/* Filters & Search */}
      <div className="grid gap-4 md:grid-cols-3 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
        {/* Search Name */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-10 w-full rounded-lg border border-slate-200 pl-10 pr-4 text-sm outline-none transition-all focus:border-govBlue focus:ring-1 focus:ring-govBlue"
          />
        </div>

        {/* Search Aadhaar */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Aadhaar..."
            value={searchAadhaar}
            onChange={(e) => setSearchAadhaar(e.target.value)}
            className="h-10 w-full rounded-lg border border-slate-200 pl-10 pr-4 text-sm outline-none transition-all focus:border-govBlue focus:ring-1 focus:ring-govBlue"
          />
        </div>

        {/* Category Filter */}
        <div className="flex items-center space-x-2">
          <Filter className="h-4.5 w-4.5 text-slate-400" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none cursor-pointer focus:border-govBlue"
          >
            <option value="ALL">All Categories</option>
            <option value="GENERAL">General</option>
            <option value="OBC">OBC</option>
            <option value="SC">SC</option>
            <option value="ST">ST</option>
            <option value="BPL">BPL</option>
          </select>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="bg-white rounded-xl border border-slate-100 py-20 shadow-sm">
          <LoadingSpinner size="large" />
          <p className="text-center text-xs font-semibold text-slate-400 mt-4">Connecting to core systems...</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm text-slate-500">
                <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4">Name</th>
                    <th className="px-6 py-4">Aadhaar UID</th>
                    <th className="px-6 py-4">Phone</th>
                    <th className="px-6 py-4">Region</th>
                    <th className="px-6 py-4">Annual Income</th>
                    <th className="px-6 py-4">Category</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedData.map((b) => {
                    const name = b.user
                      ? `${b.user.firstName || ''} ${b.user.lastName || ''}`
                      : 'Unlinked Citizen';

                    return (
                      <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-semibold text-slate-800">{name}</td>
                        <td className="px-6 py-4 font-mono text-xs">{b.uniqueIdNumber}</td>
                        <td className="px-6 py-4">{b.phoneNumber}</td>
                        <td className="px-6 py-4">{b.district ? `${b.district}, ${b.state}` : b.address}</td>
                        <td className="px-6 py-4 font-semibold text-slate-700">₹{b.annualIncome?.toLocaleString() || '0'}</td>
                        <td className="px-6 py-4">
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                            {b.category}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center space-x-1 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${
                              b.eligibilityStatus === 'VERIFIED'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : b.eligibilityStatus === 'PENDING'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : b.eligibilityStatus === 'CHANGES_REQUIRED'
                                ? 'bg-orange-50 text-orange-700 border border-orange-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                          >
                            {b.eligibilityStatus === 'VERIFIED' && <UserCheck className="h-3 w-3 mr-1" />}
                            {b.eligibilityStatus === 'PENDING' && <Clock className="h-3 w-3 mr-1" />}
                            {b.eligibilityStatus === 'CHANGES_REQUIRED' && <MessageSquare className="h-3 w-3 mr-1" />}
                            {b.eligibilityStatus === 'REJECTED' && <ShieldAlert className="h-3 w-3 mr-1" />}
                            <span>{b.eligibilityStatus === 'CHANGES_REQUIRED' ? 'CHANGES REQ' : b.eligibilityStatus}</span>
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end space-x-1">
                            {(b.eligibilityStatus === 'PENDING' || b.eligibilityStatus === 'CHANGES_REQUIRED') && (
                              <>
                                <button
                                  onClick={() => {
                                    setConfirmApproveBen({ id: b.id, name });
                                    setApprovalRemarks('');
                                  }}
                                  className="rounded-lg p-1.5 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 hover:text-emerald-700 font-medium text-xs flex items-center gap-1 transition-all"
                                  title="Approve Beneficiary"
                                >
                                  <CheckCircle2 className="h-4 w-4" />
                                  <span className="hidden xl:inline">Approve</span>
                                </button>
                                <button
                                  onClick={() => {
                                    setConfirmRejectBen({ id: b.id, name });
                                    setApprovalRemarks('');
                                  }}
                                  className="rounded-lg p-1.5 text-rose-600 bg-rose-50 hover:bg-rose-100 hover:text-rose-700 font-medium text-xs flex items-center gap-1 transition-all"
                                  title="Reject Beneficiary"
                                >
                                  <XCircle className="h-4 w-4" />
                                  <span className="hidden xl:inline">Reject</span>
                                </button>
                                <button
                                  onClick={() => {
                                    setConfirmRequestChangesBen({ id: b.id, name });
                                    setApprovalRemarks('');
                                  }}
                                  className="rounded-lg p-1.5 text-amber-700 bg-amber-50 hover:bg-amber-100 hover:text-amber-800 font-medium text-xs flex items-center gap-1 transition-all"
                                  title="Request Changes"
                                >
                                  <MessageSquare className="h-4 w-4" />
                                  <span className="hidden xl:inline">Req Changes</span>
                                </button>
                              </>
                            )}
                            <Link
                              to={`/beneficiaries/${b.id}`}
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-all"
                              title="View Details"
                            >
                              <Eye className="h-4.5 w-4.5" />
                            </Link>
                            <Link
                              to={`/beneficiaries/edit/${b.id}`}
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-blue-600 transition-all"
                              title="Edit Profile"
                            >
                              <Edit3 className="h-4.5 w-4.5" />
                            </Link>
                            <button
                              onClick={() => promptDelete(b.id, name)}
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-all"
                              title="Delete Profile"
                            >
                              <Trash2 className="h-4.5 w-4.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {paginatedData.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-6 py-10 text-center text-slate-400 font-semibold">
                        No registered beneficiaries found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-100 pt-4 px-4 text-xs font-semibold text-slate-500">
              <p>Showing {Math.min(filtered.length, (currentPage - 1) * itemsPerPage + 1)} to {Math.min(filtered.length, currentPage * itemsPerPage)} of {filtered.length} entries</p>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-transparent"
                >
                  Previous
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-1.5 rounded-lg border ${
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
                  className="px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-transparent"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDeleteBen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl space-y-4 border border-slate-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3 text-rose-600">
                <AlertTriangle className="h-6 w-6" />
                <h3 className="text-lg font-bold text-slate-800">Delete Beneficiary?</h3>
              </div>
              <button
                onClick={() => setConfirmDeleteBen(null)}
                className="text-slate-400 hover:text-slate-600 rounded-lg p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              Are you sure you want to delete <strong className="text-slate-800">"{confirmDeleteBen.name}"</strong>? If no dependent records exist, this action will permanently remove the beneficiary.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteBen(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirmed}
                disabled={deleting}
                className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-lg shadow-rose-600/20 transition-all disabled:opacity-60 cursor-pointer"
              >
                {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                Delete Beneficiary
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approve Confirmation Modal */}
      {confirmApproveBen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl space-y-4 border border-slate-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3 text-emerald-600">
                <CheckCircle2 className="h-6 w-6" />
                <h3 className="text-lg font-bold text-slate-800">Approve Beneficiary Profile?</h3>
              </div>
              <button
                onClick={() => setConfirmApproveBen(null)}
                className="text-slate-400 hover:text-slate-600 rounded-lg p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              Are you sure you want to approve <strong className="text-slate-800">"{confirmApproveBen.name}"</strong>? This will set their eligibility status to <span className="font-bold text-emerald-600">VERIFIED</span> and enable scheme applications.
            </p>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Approval Remarks (Optional)</label>
              <textarea
                value={approvalRemarks}
                onChange={(e) => setApprovalRemarks(e.target.value)}
                placeholder="Add optional notes or remarks for beneficiary..."
                rows={2}
                className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmApproveBen(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApproveConfirmed}
                disabled={actionSubmitting}
                className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-lg shadow-emerald-600/20 transition-all disabled:opacity-60 cursor-pointer"
              >
                {actionSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                Approve Beneficiary
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Confirmation Modal */}
      {confirmRejectBen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl space-y-4 border border-slate-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3 text-rose-600">
                <XCircle className="h-6 w-6" />
                <h3 className="text-lg font-bold text-slate-800">Reject Beneficiary Registration?</h3>
              </div>
              <button
                onClick={() => setConfirmRejectBen(null)}
                className="text-slate-400 hover:text-slate-600 rounded-lg p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              Rejecting <strong className="text-slate-800">"{confirmRejectBen.name}"</strong> will mark their status as <span className="font-bold text-rose-600">REJECTED</span>. Please enter the reason for rejection.
            </p>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Rejection Reason (Required)</label>
              <textarea
                value={approvalRemarks}
                onChange={(e) => setApprovalRemarks(e.target.value)}
                placeholder="State the explicit reason for rejection..."
                rows={3}
                className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-800 focus:ring-2 focus:ring-rose-500 focus:outline-none"
              />
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmRejectBen(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRejectConfirmed}
                disabled={actionSubmitting}
                className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-lg shadow-rose-600/20 transition-all disabled:opacity-60 cursor-pointer"
              >
                {actionSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
                Reject Beneficiary
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Request Changes Modal */}
      {confirmRequestChangesBen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl space-y-4 border border-slate-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3 text-amber-600">
                <MessageSquare className="h-6 w-6" />
                <h3 className="text-lg font-bold text-slate-800">Request Profile Changes?</h3>
              </div>
              <button
                onClick={() => setConfirmRequestChangesBen(null)}
                className="text-slate-400 hover:text-slate-600 rounded-lg p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              Request changes for <strong className="text-slate-800">"{confirmRequestChangesBen.name}"</strong>. The beneficiary will be allowed to update their profile and resubmit.
            </p>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Requested Changes Remarks (Required)</label>
              <textarea
                value={approvalRemarks}
                onChange={(e) => setApprovalRemarks(e.target.value)}
                placeholder="Specify what details need correction or re-upload..."
                rows={3}
                className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmRequestChangesBen(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRequestChangesConfirmed}
                disabled={actionSubmitting}
                className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-lg shadow-amber-600/20 transition-all disabled:opacity-60 cursor-pointer"
              >
                {actionSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MessageSquare className="h-3.5 w-3.5" />}
                Send Change Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
