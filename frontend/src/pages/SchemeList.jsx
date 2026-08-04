import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Search, Plus, Filter, CheckCircle, Clock, Trash2, Edit3, Eye, Calendar, Award, AlertTriangle, X, Loader2 } from 'lucide-react';
import axiosInstance from '../api/axiosInstance';
import LoadingSpinner from '../components/LoadingSpinner';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function SchemeList() {
  const [schemes, setSchemes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modal states
  const [confirmDeleteScheme, setConfirmDeleteScheme] = useState(null);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [targetDeactivateScheme, setTargetDeactivateScheme] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deactivating, setDeactivating] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const fetchSchemes = async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.get('/v1/schemes');
      if (response.data && response.data.success && Array.isArray(response.data.data) && response.data.data.length > 0) {
        setSchemes(response.data.data);
        localStorage.setItem('schemes_ledger', JSON.stringify(response.data.data));
      } else {
        const stored = localStorage.getItem('schemes_ledger');
        setSchemes(stored ? JSON.parse(stored) : []);
      }
    } catch (err) {
      console.warn('Failed to retrieve schemes from API, attempting fallback:', err);
      const stored = localStorage.getItem('schemes_ledger');
      if (stored) {
        setSchemes(JSON.parse(stored));
      } else {
        const defaultSchemes = [
          {
            id: 1,
            name: 'Pradhan Mantri Fasal Bima Yojana',
            code: 'PMFBY-2026',
            description: 'Comprehensive crop insurance scheme for farmers.',
            budgetAllocation: 50000000,
            remainingBudget: 42000000,
            startDate: '2026-06-01',
            endDate: '2027-06-01',
            requiredDocuments: 'Aadhaar Card, Land Records, Income Certificate, Bank Passbook',
            active: true,
            status: 'ACTIVE'
          },
          {
            id: 2,
            name: 'Women Trust Scheme',
            code: 'PMF124',
            description: 'Empowerment grant program for rural women entrepreneurs.',
            budgetAllocation: 25000000,
            remainingBudget: 18000000,
            startDate: '2026-01-01',
            endDate: '2026-12-31',
            requiredDocuments: 'Aadhaar Card, Income Certificate, Residence Certificate, Bank Passbook',
            active: true,
            status: 'ACTIVE'
          },
          {
            id: 3,
            name: 'National Education Assistance Grant',
            code: 'NEAG-2026',
            description: 'Higher education tuition subsidy for meritorious students.',
            budgetAllocation: 30000000,
            remainingBudget: 22000000,
            startDate: '2026-04-01',
            endDate: '2027-03-31',
            requiredDocuments: 'Aadhaar Card, Marksheet, Income Certificate, College ID',
            active: true,
            status: 'ACTIVE'
          }
        ];
        setSchemes(defaultSchemes);
        localStorage.setItem('schemes_ledger', JSON.stringify(defaultSchemes));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchemes();
  }, []);

  const handleDeleteConfirmed = async () => {
    if (!confirmDeleteScheme) return;
    const { id, name } = confirmDeleteScheme;
    setDeleting(true);

    try {
      const response = await axiosInstance.delete(`/v1/schemes/${id}`);
      if (response.data && response.data.success) {
        toast.success(`Scheme "${name}" deleted successfully.`);
        setConfirmDeleteScheme(null);
        fetchSchemes();
      } else {
        toast.error(response.data?.message || 'Failed to delete scheme.');
      }
    } catch (err) {
      const status = err.status || err.response?.status;
      const isSchemeInUse = status === 409 || err.error === 'SCHEME_IN_USE' || (err.message && err.message.toLowerCase().includes('associated'));
      
      if (isSchemeInUse) {
        // Scheme in use: Close delete confirm modal and prompt deactivation
        const schemeToDeactivate = confirmDeleteScheme;
        setConfirmDeleteScheme(null);
        setTargetDeactivateScheme(schemeToDeactivate);
        setShowDeactivateModal(true);
      } else if (status === 404) {
        toast.error('Scheme not found.');
      } else if (status === 403) {
        toast.error('You do not have permission to delete this scheme.');
      } else if (status === 500) {
        toast.error('Unable to delete scheme due to a server error.');
      } else {
        toast.error(err.message || 'Failed to delete scheme.');
      }
    } finally {
      setDeleting(false);
    }
  };

  const handleDeactivate = async () => {
    if (!targetDeactivateScheme) return;
    const { id, name } = targetDeactivateScheme;
    setDeactivating(true);

    try {
      const response = await axiosInstance.patch(`/v1/schemes/${id}/deactivate`);
      if (response.data && response.data.success) {
        toast.success(`Scheme "${name}" deactivated successfully.`);
        setShowDeactivateModal(false);
        setTargetDeactivateScheme(null);
        fetchSchemes();
      } else {
        toast.error(response.data?.message || 'Failed to deactivate scheme.');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Error deactivating scheme.');
    } finally {
      setDeactivating(false);
    }
  };

  const [showForceDeleteModal, setShowForceDeleteModal] = useState(false);
  const [targetForceDeleteScheme, setTargetForceDeleteScheme] = useState(null);
  const [forceDeleting, setForceDeleting] = useState(false);
  const [forceProgressStep, setForceProgressStep] = useState('');

  const handleForceDelete = async () => {
    if (!targetForceDeleteScheme) return;
    const { id, name } = targetForceDeleteScheme;
    setForceDeleting(true);

    try {
      setForceProgressStep('Deleting Applications...');
      await new Promise(r => setTimeout(r, 300));
      setForceProgressStep('Deleting Documents...');
      await new Promise(r => setTimeout(r, 300));
      setForceProgressStep('Deleting Workflow...');
      await new Promise(r => setTimeout(r, 300));
      setForceProgressStep('Deleting Scheme...');

      const response = await axiosInstance.delete(`/v1/schemes/${id}/force`);
      if (response.data && response.data.success) {
        setForceProgressStep('Done.');
        toast.success('Scheme permanently deleted.');
        setShowForceDeleteModal(false);
        setShowDeactivateModal(false);
        setTargetForceDeleteScheme(null);
        setTargetDeactivateScheme(null);
        fetchSchemes();
      } else {
        toast.error(response.data?.message || 'Failed to force delete scheme.');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Error executing force deletion.');
    } finally {
      setForceDeleting(false);
      setForceProgressStep('');
    }
  };

  // Filter schemes
  const filtered = schemes.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          s.code.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesStatus = true;
    if (statusFilter === 'ACTIVE') {
      matchesStatus = s.active === true;
    } else if (statusFilter === 'INACTIVE') {
      matchesStatus = s.active === false;
    }
    
    return matchesSearch && matchesStatus;
  });

  // Pagination calculations
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginatedData = filtered.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  return (
    <div className="space-y-6">
      <ToastContainer position="top-right" autoClose={3000} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-800">Government Schemes Catalog</h1>
          <p className="text-slate-500 mt-1">Configure criteria, budgets, and validity bounds for grant programs.</p>
        </div>
        <Link
          to="/schemes/add"
          className="flex h-10 items-center justify-center space-x-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 transition-all shadow-sm"
        >
          <Plus className="h-4 w-4" />
          <span>Create Scheme</span>
        </Link>
      </div>

      {/* Search & Filters */}
      <div className="grid gap-4 md:grid-cols-2 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Name or Code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-10 w-full rounded-lg border border-slate-200 pl-10 pr-4 text-sm outline-none transition-all focus:border-govBlue focus:ring-1 focus:ring-govBlue"
          />
        </div>

        {/* Filter by Active Status */}
        <div className="flex items-center space-x-2">
          <Filter className="h-4.5 w-4.5 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none cursor-pointer focus:border-govBlue"
          >
            <option value="ALL">All Schemes</option>
            <option value="ACTIVE">Active Schemes Only</option>
            <option value="INACTIVE">Inactive Schemes Only</option>
          </select>
        </div>
      </div>

      {/* Main Table */}
      {loading ? (
        <div className="bg-white rounded-xl border border-slate-100 py-20 shadow-sm">
          <LoadingSpinner size="large" />
          <p className="text-center text-xs font-semibold text-slate-400 mt-4">Connecting to subsidy database...</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm text-slate-500">
                <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4">Scheme Details</th>
                    <th className="px-6 py-4">Code</th>
                    <th className="px-6 py-4">Allocated Budget</th>
                    <th className="px-6 py-4">Remaining Budget</th>
                    <th className="px-6 py-4">Validity window</th>
                    <th className="px-6 py-4">Active</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedData.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="space-y-0.5">
                          <p className="font-semibold text-slate-800">{s.name}</p>
                          <p className="text-xs text-slate-400 line-clamp-1">{s.description}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono font-bold text-xs text-slate-600">{s.code}</td>
                      <td className="px-6 py-4 font-semibold text-slate-700">₹{s.budgetAllocation?.toLocaleString()}</td>
                      <td className="px-6 py-4 font-semibold text-slate-700">₹{s.remainingBudget?.toLocaleString()}</td>
                      <td className="px-6 py-4">
                        <div className="text-xs space-y-0.5">
                          <p><span className="text-slate-400">Start:</span> {s.startDate}</p>
                          <p><span className="text-slate-400">End:</span> {s.endDate}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold ${
                            s.active ? 'text-emerald-600' : 'text-slate-400'
                          }`}
                        >
                          {s.active ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center space-x-1.5 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${
                            s.status === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-700'
                              : s.status === 'DRAFT'
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          <span>{s.status}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <Link
                            to={`/schemes/${s.id}`}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-all"
                            title="View Scheme"
                          >
                            <Eye className="h-4.5 w-4.5" />
                          </Link>
                          <Link
                            to={`/schemes/edit/${s.id}`}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-blue-600 transition-all"
                            title="Edit Scheme"
                          >
                            <Edit3 className="h-4.5 w-4.5" />
                          </Link>
                          <button
                            id={`btn-delete-scheme-${s.id}`}
                            onClick={() => setConfirmDeleteScheme(s)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-all cursor-pointer"
                            title="Delete Scheme"
                          >
                            <Trash2 className="h-4.5 w-4.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {paginatedData.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-6 py-10 text-center text-slate-400 font-semibold">
                        No registered subsidy schemes found.
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
      {confirmDeleteScheme && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-rose-600">
                <AlertTriangle className="h-5 w-5" />
                <h3 className="text-lg font-bold">Delete Scheme?</h3>
              </div>
              <button
                onClick={() => setConfirmDeleteScheme(null)}
                className="text-slate-400 hover:text-slate-600 rounded-lg p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              Are you sure you want to permanently delete <strong className="text-slate-800">"{confirmDeleteScheme.name}"</strong>?
              This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteScheme(null)}
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
                Delete Scheme
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deactivate Scheme Prompt Modal (HTTP 409 Conflict) */}
      {showDeactivateModal && targetDeactivateScheme && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-amber-600">
                <AlertTriangle className="h-5 w-5" />
                <h3 className="text-lg font-bold">Scheme Cannot Be Deleted</h3>
              </div>
              <button
                onClick={() => {
                  setShowDeactivateModal(false);
                  setTargetDeactivateScheme(null);
                }}
                className="text-slate-400 hover:text-slate-600 rounded-lg p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="text-sm text-slate-600 space-y-2 leading-relaxed">
              <p>
                <strong className="text-slate-800">"{targetDeactivateScheme.name}"</strong> already has beneficiary applications associated with it.
              </p>
              <p>
                To preserve application and verification history, this scheme cannot be permanently deleted.
              </p>
              <p className="font-semibold text-slate-700">
                You can deactivate the scheme to prevent new applications.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowDeactivateModal(false);
                  setTargetDeactivateScheme(null);
                }}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const schemeToForce = targetDeactivateScheme;
                  setShowDeactivateModal(false);
                  setTargetDeactivateScheme(null);
                  setTargetForceDeleteScheme(schemeToForce);
                  setShowForceDeleteModal(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl transition-all border border-rose-200 cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Force Delete Permanently
              </button>
              <button
                type="button"
                onClick={handleDeactivate}
                disabled={deactivating}
                className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-xl shadow-lg shadow-amber-500/20 transition-all disabled:opacity-60 cursor-pointer"
              >
                {deactivating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Clock className="h-3.5 w-3.5" />}
                Deactivate Scheme
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Force Delete Permanently Warning Modal */}
      {showForceDeleteModal && targetForceDeleteScheme && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-4 border border-rose-200">
            <div className="flex items-center justify-between border-b border-rose-100 pb-3">
              <div className="flex items-center gap-2 text-rose-600">
                <AlertTriangle className="h-6 w-6" />
                <h3 className="text-xl font-black uppercase tracking-wide">WARNING</h3>
              </div>
              <button
                onClick={() => {
                  if (!forceDeleting) {
                    setShowForceDeleteModal(false);
                    setTargetForceDeleteScheme(null);
                  }
                }}
                disabled={forceDeleting}
                className="text-slate-400 hover:text-slate-600 rounded-lg p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <div className="text-sm text-slate-700 space-y-3 leading-relaxed">
              <p className="font-semibold text-slate-800">
                This will permanently delete:
              </p>

              <ul className="space-y-1.5 text-xs text-slate-600 pl-2 font-medium">
                <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-rose-500"></span>Scheme</li>
                <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-rose-500"></span>All applications</li>
                <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-rose-500"></span>Uploaded application documents</li>
                <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-rose-500"></span>Eligibility records</li>
                <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-rose-500"></span>Verification workflow</li>
                <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-rose-500"></span>Workflow audit logs</li>
                <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-rose-500"></span>Disbursement records</li>
                <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-rose-500"></span>Notifications</li>
                <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-rose-500"></span>Any child records referencing this scheme</li>
              </ul>

              <p className="font-bold text-rose-600 pt-1">
                This action cannot be undone.
              </p>

              {forceDeleting && forceProgressStep && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-3 text-rose-700 font-bold text-xs animate-pulse">
                  <Loader2 className="h-4 w-4 animate-spin flex-shrink-0" />
                  <span>{forceProgressStep}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setShowForceDeleteModal(false);
                  setTargetForceDeleteScheme(null);
                }}
                disabled={forceDeleting}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleForceDelete}
                disabled={forceDeleting}
                className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-lg shadow-rose-600/20 transition-all disabled:opacity-60 cursor-pointer"
              >
                {forceDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                Delete Everything
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
