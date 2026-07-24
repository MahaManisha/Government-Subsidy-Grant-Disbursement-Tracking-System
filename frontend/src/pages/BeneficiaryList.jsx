import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Search, Plus, Filter, UserCheck, ShieldAlert, Trash2, Edit3, Eye } from 'lucide-react';
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
      toast.error(err.message || 'Failed to load beneficiaries.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBeneficiaries();
  }, []);

  // Delete beneficiary
  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to permanently delete the profile of ${name}?`)) {
      return;
    }

    try {
      const response = await axiosInstance.delete(`/v1/beneficiaries/${id}`);
      if (response.data && response.data.success) {
        toast.success(`Beneficiary profile of ${name} deleted successfully.`);
        fetchBeneficiaries();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to delete beneficiary.');
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
                                ? 'bg-emerald-50 text-emerald-700'
                                : b.eligibilityStatus === 'PENDING'
                                ? 'bg-amber-50 text-amber-700'
                                : 'bg-rose-50 text-rose-700'
                            }`}
                          >
                            {b.eligibilityStatus === 'VERIFIED' && <UserCheck className="h-3 w-3 mr-1" />}
                            {b.eligibilityStatus === 'REJECTED' && <ShieldAlert className="h-3 w-3 mr-1" />}
                            <span>{b.eligibilityStatus}</span>
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end space-x-2">
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
                              onClick={() => handleDelete(b.id, name)}
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
    </div>
  );
}
