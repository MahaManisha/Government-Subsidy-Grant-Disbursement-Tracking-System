import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Search, Plus, Filter, CheckCircle, Clock, Trash2, Edit3, Eye, Calendar, Award } from 'lucide-react';
import axiosInstance from '../api/axiosInstance';
import LoadingSpinner from '../components/LoadingSpinner';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function SchemeList() {
  const [schemes, setSchemes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

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
        // Fallback default schemes if local storage is empty
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

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to permanently delete the scheme "${name}"?`)) {
      return;
    }

    try {
      const response = await axiosInstance.delete(`/v1/schemes/${id}`);
      if (response.data && response.data.success) {
        toast.success(`Scheme "${name}" deleted successfully.`);
        fetchSchemes();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to delete scheme.');
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
                            onClick={() => handleDelete(s.id, s.name)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-all"
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
    </div>
  );
}
