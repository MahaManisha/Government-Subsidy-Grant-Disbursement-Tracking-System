import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronLeft, ChevronRight, RefreshCw, BookOpen, Clock, Check, CheckCircle, X, XCircle, ArrowRight, FileText, User, MessageSquare, Shield, MapPin, Download, Eye } from 'lucide-react';
import axiosInstance from '../api/axiosInstance';
import LoadingSpinner from '../components/LoadingSpinner';
import { useRole } from '../layouts/ProtectedLayout';
import ErrorBoundary from '../components/ErrorBoundary';

export default function DistrictReviews() {
  const navigate = useNavigate();
  const auth = useRole();
  const [applications, setApplications] = useState([]);
  const [officers, setOfficers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedApp, setSelectedApp] = useState(null);
  
  const [reviewMode, setReviewMode] = useState('review');
  const [activeDoc, setActiveDoc] = useState(null);

  const [reviewRemarks, setReviewRemarks] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  
  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDistrict, setFilterDistrict] = useState('');
  const [filterScheme, setFilterScheme] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterDate, setFilterDate] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const loadData = async () => {
    setLoading(true);
    try {
      const appsRes = await axiosInstance.get('/v1/applications');
      if (appsRes.data && appsRes.data.success) {
        setApplications(appsRes.data.data || []);
      }
      const usersRes = await axiosInstance.get('/v1/users');
      if (usersRes.data && usersRes.data.success) {
        setOfficers(usersRes.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load reviews data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const actingOfficerId = officers.find(o => o.username === auth?.user?.username)?.id || 10;
  const actingOfficerName = officers.find(o => o.username === auth?.user?.username)
    ? `${officers.find(o => o.username === auth?.user?.username).firstName} ${officers.find(o => o.username === auth?.user?.username).lastName}`
    : 'District Officer';

  const [realDocuments, setRealDocuments] = useState([]);

  const handleReviewClick = (app, mode) => {
    navigate(`/verification/district/reviews/${app.id}`);
  };

  const getPriority = (app) => {
    if (app.priority) return app.priority;
    if (app.beneficiary?.annualIncome <= 150000) return 'HIGH';
    if (app.beneficiary?.annualIncome <= 300000) return 'MEDIUM';
    return 'LOW';
  };

  // Only applications that have passed field officer verification and are waiting for district review
  const officerApplications = applications.filter(a => a.currentStage === 'DISTRICT_REVIEW' || a.currentStage === 'DISTRICT_REVIEW_PENDING');

  const uniqueDistricts = [...new Set(applications.map(a => a.beneficiary?.district).filter(Boolean))];
  const uniqueSchemes = [...new Set(applications.map(a => a.scheme?.name).filter(Boolean))];

  const filteredList = officerApplications.filter(a => {
    const searchLower = searchTerm.toLowerCase();
    const idMatch = a.applicationNumber?.toLowerCase()?.includes(searchLower) || false;
    const benUser = a.beneficiary?.user || {};
    const fullName = `${benUser.firstName || ''} ${benUser.lastName || ''}`.trim().toLowerCase();
    const nameMatch = fullName.includes(searchLower);
    const schemeMatch = a.scheme?.name?.toLowerCase()?.includes(searchLower) || false;

    if (searchTerm && !(idMatch || nameMatch || schemeMatch)) return false;

    if (filterDistrict && a.beneficiary?.district !== filterDistrict) return false;
    if (filterScheme && a.scheme?.name !== filterScheme) return false;
    if (filterPriority && getPriority(a) !== filterPriority) return false;

    if (filterStatus) {
      if (filterStatus === 'PENDING') {
        const isPending = a.workflowStatus === 'UNDER_REVIEW' || a.workflowStatus === 'FIELD_VERIFIED';
        if (!isPending) return false;
      } else if (filterStatus === 'APPROVED') {
        if (a.workflowStatus !== 'DISTRICT_APPROVED') return false;
      } else if (filterStatus === 'REJECTED') {
        if (a.workflowStatus !== 'DISTRICT_REJECTED') return false;
      } else if (filterStatus === 'CORRECTION') {
        if (a.workflowStatus !== 'CORRECTION_REQUIRED') return false;
      }
    }

    if (filterDate) {
      const appDate = a.submittedDate ? new Date(a.submittedDate).toISOString().split('T')[0] : '';
      if (appDate !== filterDate) return false;
    }

    return true;
  });

  const totalPages = Math.ceil(filteredList.length / itemsPerPage) || 1;
  const paginatedList = filteredList.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleDownloadDoc = (doc) => {
    if (!doc) return;
    const link = document.createElement('a');
    link.href = `http://localhost:8080/v1/documents/${doc.id}/download`;
    link.download = doc.originalFileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-100 py-20 shadow-sm flex flex-col items-center justify-center">
        <LoadingSpinner size="large" />
        <span className="text-xs text-slate-400 font-semibold mt-3">Loading review workspace queue...</span>
      </div>
    );
  }

  return (
    <ErrorBoundary fallbackMessage="Unable to load District Reviews">
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-800 md:text-3xl">District Reviews Queue</h1>
          <p className="text-slate-500 mt-1">Audit pending subsidy applications, check system recommendations, and record decisions.</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Awaiting reviews workspace</h3>
          </div>

          {/* Advanced Filters */}
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6 text-xs">
            <div className="space-y-1">
              <label className="font-bold text-slate-400 uppercase tracking-wider block text-[10px]">District</label>
              <select value={filterDistrict} onChange={(e) => setFilterDistrict(e.target.value)} className="h-9 w-full rounded-lg border border-slate-200 px-2 outline-none focus:border-indigo-500 bg-white">
                <option value="">All Districts</option>
                {uniqueDistricts.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="font-bold text-slate-400 uppercase tracking-wider block text-[10px]">Scheme</label>
              <select value={filterScheme} onChange={(e) => setFilterScheme(e.target.value)} className="h-9 w-full rounded-lg border border-slate-200 px-2 outline-none focus:border-indigo-500 bg-white">
                <option value="">All Schemes</option>
                {uniqueSchemes.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="font-bold text-slate-400 uppercase tracking-wider block text-[10px]">Status</label>
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="h-9 w-full rounded-lg border border-slate-200 px-2 outline-none focus:border-indigo-500 bg-white">
                <option value="">All Statuses</option>
                <option value="PENDING">Pending Review</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
                <option value="CORRECTION">Correction Required</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="font-bold text-slate-400 uppercase tracking-wider block text-[10px]">Priority</label>
              <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)} className="h-9 w-full rounded-lg border border-slate-200 px-2 outline-none focus:border-indigo-500 bg-white">
                <option value="">All Priorities</option>
                <option value="HIGH">High Priority</option>
                <option value="MEDIUM">Medium Priority</option>
                <option value="LOW">Low Priority</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="font-bold text-slate-400 uppercase tracking-wider block text-[10px]">Application Date</label>
              <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="h-9 w-full rounded-lg border border-slate-200 px-2 outline-none focus:border-indigo-500 bg-white" />
            </div>
            <div className="space-y-1">
              <label className="font-bold text-slate-400 uppercase tracking-wider block text-[10px]">Search Term</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="ID, name, scheme..."
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                  className="h-9 w-full rounded-lg border border-slate-200 pl-8 pr-2 text-xs outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Table */}
          {paginatedList.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-xs flex flex-col items-center justify-center space-y-2 border border-dashed border-slate-100 rounded-xl">
              <FileText className="h-8 w-8 text-slate-300" />
              <span className="font-bold">No application files waiting in review queue.</span>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs text-slate-500">
                  <thead className="bg-slate-50 font-bold uppercase tracking-wider text-slate-500 border-b border-slate-150">
                    <tr>
                      <th className="px-3 py-3">Application ID</th>
                      <th className="px-3 py-3">Beneficiary Name</th>
                      <th className="px-3 py-3">Scheme Name</th>
                      <th className="px-3 py-3">Category</th>
                      <th className="px-3 py-3">Field Officer</th>
                      <th className="px-3 py-3">District</th>
                      <th className="px-3 py-3">Date</th>
                      <th className="px-3 py-3 text-center">Score</th>
                      <th className="px-3 py-3 text-right">Requested</th>
                      <th className="px-3 py-3 text-center">Status</th>
                      <th className="px-3 py-3 text-center">Priority</th>
                      <th className="px-3 py-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-semibold">
                    {paginatedList.map((app) => {
                      const priority = getPriority(app);
                      const officerName = app.assignedOfficer
                        ? `${app.assignedOfficer.firstName} ${app.assignedOfficer.lastName ? app.assignedOfficer.lastName.charAt(0) + '.' : ''}`.trim()
                        : 'Unassigned';
                      
                      return (
                        <tr key={app.id} className="hover:bg-slate-50/40 transition-all">
                          <td className="px-3 py-3.5 font-bold text-indigo-650">{app.applicationNumber}</td>
                          <td className="px-3 py-3.5 text-slate-800">{app.beneficiary?.user?.firstName ? `${app.beneficiary.user.firstName} ${app.beneficiary.user.lastName || ''}`.trim() : 'N/A'}</td>
                          <td className="px-3 py-3.5 text-slate-650 truncate max-w-[120px]">{app.scheme?.name || 'N/A'}</td>
                          <td className="px-3 py-3.5 text-slate-500">{app.beneficiary?.category || 'General'}</td>
                          <td className="px-3 py-3.5 text-slate-500 font-medium">{officerName}</td>
                          <td className="px-3 py-3.5 text-slate-500">{app.beneficiary?.district || 'Gandhinagar'}</td>
                          <td className="px-3 py-3.5 text-slate-450 font-medium">{app.submittedDate ? new Date(app.submittedDate).toLocaleDateString() : 'N/A'}</td>
                          <td className="px-3 py-3.5 text-center text-slate-800 font-bold">{app.eligibilityScore || 85}</td>
                          <td className="px-3 py-3.5 text-right font-bold text-slate-700">₹{app.requestedAmount?.toLocaleString()}</td>
                          <td className="px-3 py-3.5 text-center">
                            <span className={`inline-flex items-center space-x-1 rounded-full px-2 py-0.5 text-[9px] font-bold ${app.workflowStatus === 'APPROVED' || app.workflowStatus === 'DISTRICT_APPROVED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : app.workflowStatus === 'REJECTED' || app.workflowStatus === 'DISTRICT_REJECTED' ? 'bg-rose-50 text-rose-700 border border-rose-100' : 'bg-amber-50 text-amber-700 border border-amber-100'}`}>
                              <span>{app.workflowStatus || 'UNDER_REVIEW'}</span>
                            </span>
                          </td>
                          <td className="px-3 py-3.5 text-center">
                            <span className={`inline-flex rounded px-1.5 py-0.5 text-[9px] font-bold ${priority === 'HIGH' ? 'bg-rose-100 text-rose-750' : priority === 'MEDIUM' ? 'bg-amber-100 text-amber-750' : 'bg-slate-100 text-slate-700'}`}>
                              {priority}
                            </span>
                          </td>
                          <td className="px-3 py-3.5 text-center">
                            <div className="flex items-center justify-center space-x-1.5">
                              <button onClick={() => handleReviewClick(app, 'view')} title="View Details" className="h-7 w-7 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-all shadow-3xs cursor-pointer">
                                <Eye className="h-3.5 w-3.5" />
                              </button>
                              <button onClick={() => handleReviewClick(app, 'review')} title="Audit Review" className="inline-flex items-center space-x-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 px-2 py-1 text-[11px] font-bold text-indigo-650 transition-all font-sans cursor-pointer">
                                <span>Review</span>
                                <ArrowRight className="h-3 w-3" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination footer */}
              <div className="flex items-center justify-between border-t border-slate-100 pt-4 text-xs font-semibold text-slate-500">
                <button onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1} className="inline-flex items-center space-x-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 hover:bg-slate-50 disabled:opacity-40 shadow-3xs cursor-pointer">
                  <ChevronLeft className="h-4 w-4" />
                  <span>Previous</span>
                </button>
                <span>Page {currentPage} of {totalPages}</span>
                <button onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages} className="inline-flex items-center space-x-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 hover:bg-slate-50 disabled:opacity-40 shadow-3xs cursor-pointer">
                  <span>Next</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
}
