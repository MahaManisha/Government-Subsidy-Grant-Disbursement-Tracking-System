import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronLeft, ChevronRight, RefreshCw, BookOpen, Clock, Check, CheckCircle, XCircle, ArrowRight, FileText, User, MessageSquare, Shield, MapPin, Download, Eye } from 'lucide-react';
import axiosInstance from '../api/axiosInstance';
import LoadingSpinner from '../components/LoadingSpinner';
import { useRole } from '../layouts/ProtectedLayout';

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

  // Remarks and Action controls
  const [reviewRemarks, setReviewRemarks] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const [showCorrectConfirm, setShowCorrectConfirm] = useState(false);
  const [showDocsConfirm, setShowDocsConfirm] = useState(false);

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

  const handleReviewClick = (app, mode) => {
    setReviewMode(mode);
    setSelectedApp(app);
    setReviewRemarks('');
    setRejectionReason('');
    const docs = getSimulatedDocuments(app);
    setActiveDoc(docs[0]);
  };

  const submitAction = async (actionType) => {
    if (!reviewRemarks.trim()) {
      alert('Remarks are mandatory before submitting any decision.');
      return;
    }
    setSubmitting(true);
    
    let backendAction = 'APPROVE';
    let localStatus = 'DISTRICT_APPROVED';
    let localStage = 'FINANCE_REVIEW';

    if (actionType === 'REJECT') {
      backendAction = 'REJECT';
      localStatus = 'DISTRICT_REJECTED';
      localStage = 'DISTRICT_REVIEW';
    } else if (actionType === 'REQUEST_REVERIFICATION') {
      backendAction = 'REQUEST_REVERIFICATION';
      localStatus = 'CORRECTION_REQUIRED';
      localStage = 'FIELD_VERIFICATION';
    } else if (actionType === 'REQUEST_ADDITIONAL_DOCS') {
      backendAction = 'REQUEST_REVERIFICATION';
      localStatus = 'CORRECTION_REQUIRED';
      localStage = 'FIELD_VERIFICATION';
    }

    const payload = {
      officerId: Number(actingOfficerId),
      action: backendAction,
      remarks: reviewRemarks,
      rejectionReason: actionType === 'REJECT' ? (rejectionReason || reviewRemarks) : null
    };

    try {
      const response = await axiosInstance.post(
        `/v1/applications/${selectedApp.id}/verification/district-review`,
        payload
      );

      if (response.data && response.data.success) {
        const ledgerStr = localStorage.getItem('applications_ledger');
        if (ledgerStr) {
          const ledger = JSON.parse(ledgerStr);
          const updated = ledger.map(a => {
            if (a.id === selectedApp.id || a.applicationNumber === selectedApp.applicationNumber) {
              const updatedRemarks = `${actionType === 'REQUEST_ADDITIONAL_DOCS' ? 'Docs Requested: ' : ''}${reviewRemarks}`;
              const oldTimeline = a.timeline || [];
              const newEvent = {
                title: actionType === 'APPROVE' ? 'District Officer Approved' : actionType === 'REJECT' ? 'District Officer Rejected' : 'Correction Requested',
                date: new Date().toISOString().split('T')[0],
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                officer: actingOfficerName,
                role: 'District Officer',
                remarks: updatedRemarks
              };
              return {
                ...a,
                workflowStatus: localStatus,
                currentStage: localStage,
                remarks: updatedRemarks,
                rejectionReason: actionType === 'REJECT' ? rejectionReason : null,
                lastModifiedDate: new Date().toISOString(),
                timeline: [...oldTimeline, newEvent]
              };
            }
            return a;
          });
          localStorage.setItem('applications_ledger', JSON.stringify(updated));
        }

        alert(`Decision successfully recorded: ${actionType}`);
        setSelectedApp(null);
        setShowApproveConfirm(false);
        setShowRejectConfirm(false);
        setShowCorrectConfirm(false);
        setShowDocsConfirm(false);
        loadData();
      }
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Action submission failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const getSimulatedDocuments = (app) => {
    const name = app?.scheme?.name?.toLowerCase() || '';
    const docs = [
      { name: 'Aadhaar Card Copy', key: 'aadhaar', verified: true, desc: `UID Number: ${app?.beneficiary?.uniqueIdNumber || 'Verified'}` },
      { name: 'Income Certificate', key: 'income', verified: true, desc: `Annual Income: ₹${app?.beneficiary?.annualIncome?.toLocaleString() || 'N/A'}` },
      { name: 'Residence Certificate', key: 'residence', verified: true, desc: `Residency: ${app?.beneficiary?.district || 'Gandhinagar'}, ${app?.beneficiary?.state || 'Gujarat'}` },
      { name: 'Bank Details Passbook', key: 'passbook', verified: true, desc: `A/C Number: ${app?.beneficiary?.bankAccountNumber || 'Linked'}` }
    ];
    if (name.includes('kisan') || name.includes('farm') || name.includes('crop') || name.includes('agriculture')) {
      docs.push({ name: 'Land Possession Certificate (7/12 Extract)', key: 'land', verified: true, desc: 'Land survey verified by field officer.' });
    }
    return docs;
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
    const idMatch = a.applicationNumber?.toLowerCase().includes(searchLower);
    const nameMatch = a.beneficiary?.name
      ? a.beneficiary.name.toLowerCase().includes(searchLower)
      : `${a.beneficiary?.firstName || ''} ${a.beneficiary?.lastName || ''}`.toLowerCase().includes(searchLower);
    const schemeMatch = a.scheme?.name?.toLowerCase().includes(searchLower);

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
    const name = selectedApp?.beneficiary?.name || `${selectedApp?.beneficiary?.firstName || ''} ${selectedApp?.beneficiary?.lastName || ''}`;
    const content = `GOVERNMENT OF INDIA - DBT PORTAL DOCUMENT DOWNLOAD
--------------------------------------------------
Document Type: ${doc.name}
Applicant Name: ${name}
Aadhaar Number: ${selectedApp?.beneficiary?.uniqueIdNumber}
Details: ${doc.desc}
Verification Status: SIGNED & VERIFIED BY FIELD AUDITOR
Inspection Timestamp: ${selectedApp?.verifiedDate || new Date().toISOString()}
--------------------------------------------------`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${doc.name.toLowerCase().replace(/ /g, '_')}_${selectedApp.applicationNumber}.txt`;
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-800 md:text-3xl">District Reviews Queue</h1>
          <p className="text-slate-500 mt-1">Audit pending subsidy applications, check system recommendations, and record decisions.</p>
        </div>
      </div>

      {!selectedApp ? (
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
                        ? `${app.assignedOfficer.firstName} ${app.assignedOfficer.lastName.charAt(0)}.`
                        : 'fieldofficer1';
                      
                      return (
                        <tr key={app.id} className="hover:bg-slate-50/40 transition-all">
                          <td className="px-3 py-3.5 font-bold text-indigo-650">{app.applicationNumber}</td>
                          <td className="px-3 py-3.5 text-slate-800">{app.beneficiary?.name || `${app.beneficiary?.firstName || ''} ${app.beneficiary?.lastName || 'Unlinked'}`}</td>
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
      ) : (
        /* Workspace review workspace view */
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <button onClick={() => setSelectedApp(null)} className="inline-flex items-center space-x-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-650 hover:bg-slate-50 shadow-sm transition-all cursor-pointer">
              <ChevronLeft className="h-4 w-4" />
              <span>Back to Reviews Queue</span>
            </button>
            <div className="text-right">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Currently Auditing Case</span>
              <h2 className="text-lg font-black text-slate-800 flex items-center space-x-2 justify-end">
                <span>{selectedApp.applicationNumber}</span>
                <span className={`inline-flex rounded px-1.5 py-0.5 text-[9px] font-black ${getPriority(selectedApp) === 'HIGH' ? 'bg-rose-100 text-rose-750' : 'bg-slate-100 text-slate-700'}`}>
                  {getPriority(selectedApp)} Priority
                </span>
              </h2>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              {/* Beneficiary Information */}
              <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm space-y-4">
                <div className="flex items-center space-x-2 border-b border-slate-50 pb-2.5">
                  <User className="h-5 w-5 text-indigo-500" />
                  <h3 className="text-xs font-bold text-slate-850 uppercase tracking-wider">Beneficiary Information</h3>
                </div>
                <div className="grid gap-3.5 sm:grid-cols-2 text-xs leading-relaxed">
                  <div className="bg-slate-50 rounded-xl p-3"><span className="text-slate-400 block font-semibold mb-0.5">Full Name</span><span className="font-bold text-slate-800 text-sm">{selectedApp.beneficiary?.name || `${selectedApp.beneficiary?.firstName || ''} ${selectedApp.beneficiary?.lastName || 'N/A'}`}</span></div>
                  <div className="bg-slate-50 rounded-xl p-3"><span className="text-slate-400 block font-semibold mb-0.5">Aadhaar Number</span><span className="font-mono font-bold text-slate-750 text-sm">{selectedApp.beneficiary?.uniqueIdNumber || 'N/A'}</span></div>
                  <div className="bg-slate-50 rounded-xl p-3"><span className="text-slate-400 block font-semibold mb-0.5">Mobile Number</span><span className="font-mono font-bold text-slate-750 text-sm">{selectedApp.beneficiary?.phoneNumber || 'N/A'}</span></div>
                  <div className="bg-slate-50 rounded-xl p-3"><span className="text-slate-400 block font-semibold mb-0.5">Annual Income</span><span className="font-bold text-slate-800 text-sm">₹{selectedApp.beneficiary?.annualIncome?.toLocaleString() || '0'}</span></div>
                  <div className="bg-slate-50 rounded-xl p-3"><span className="text-slate-400 block font-semibold mb-0.5">Category</span><span className="font-bold text-slate-800 text-sm">{selectedApp.beneficiary?.category || 'General'}</span></div>
                  <div className="bg-slate-50 rounded-xl p-3"><span className="text-slate-400 block font-semibold mb-0.5">Occupation (Simulated)</span><span className="font-bold text-slate-800 text-sm">
                    {selectedApp?.scheme?.name?.toLowerCase().includes('kisan') || selectedApp?.scheme?.name?.toLowerCase().includes('farm') ? 'Agricultural / Marginal Farmer' : 'Self-Employed Artisan'}
                  </span></div>
                  <div className="bg-slate-50 rounded-xl p-3 sm:col-span-2"><span className="text-slate-400 block font-semibold mb-0.5">Residential Address</span><span className="font-semibold text-slate-755">{selectedApp.beneficiary?.address || 'N/A'}, {selectedApp.beneficiary?.district || 'Gandhinagar'}, {selectedApp.beneficiary?.state || 'Gujarat'}</span></div>
                </div>
              </div>

              {/* Scheme Information */}
              <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm space-y-4">
                <div className="flex items-center space-x-2 border-b border-slate-50 pb-2.5">
                  <BookOpen className="h-5 w-5 text-indigo-500" />
                  <h3 className="text-xs font-bold text-slate-850 uppercase tracking-wider">Scheme Information</h3>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 text-xs leading-relaxed">
                  <div className="bg-slate-50 rounded-xl p-3 sm:col-span-2"><span className="text-slate-400 block font-semibold mb-0.5">Scheme Name</span><span className="font-bold text-slate-800 text-sm">{selectedApp.scheme?.name || 'N/A'}</span></div>
                  <div className="bg-slate-50 rounded-xl p-3"><span className="text-slate-400 block font-semibold mb-0.5">Requested Amount</span><span className="font-bold text-slate-800 text-sm">₹{selectedApp.requestedAmount?.toLocaleString()}</span></div>
                  <div className="bg-slate-50 rounded-xl p-3"><span className="text-slate-400 block font-semibold mb-0.5">Eligible Amount (Simulated)</span><span className="font-bold text-emerald-600 text-sm">₹{(selectedApp.requestedAmount * 0.95).toLocaleString()}</span></div>
                  <div className="bg-slate-50 rounded-xl p-3"><span className="text-slate-400 block font-semibold mb-0.5">Application Date</span><span className="font-bold text-slate-800 text-sm">{selectedApp.submittedDate ? new Date(selectedApp.submittedDate).toLocaleDateString() : 'N/A'}</span></div>
                  <div className="bg-slate-50 rounded-xl p-3 sm:col-span-2"><span className="text-slate-400 block font-semibold mb-0.5">Scheme Description</span><span className="font-semibold text-slate-650 block italic mt-1">"{selectedApp.scheme?.description}"</span></div>
                </div>
              </div>

              {/* Uploaded Documents Workspace */}
              <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm space-y-4">
                <div className="flex items-center space-x-2 border-b border-slate-50 pb-2.5">
                  <FileText className="h-5 w-5 text-indigo-500" />
                  <h3 className="text-xs font-bold text-slate-855 uppercase tracking-wider">Uploaded Documents Workspace</h3>
                </div>
                <div className="grid gap-4 md:grid-cols-5 text-xs">
                  {/* Left checklist of docs */}
                  <div className="md:col-span-2 space-y-2">
                    <p className="font-bold text-slate-400 uppercase tracking-wider text-[9px] mb-1">Select Document to Preview</p>
                    {getSimulatedDocuments(selectedApp).map((doc, idx) => (
                      <button
                        key={idx}
                        onClick={() => setActiveDoc(doc)}
                        className={`w-full flex items-center justify-between border rounded-xl p-3 transition-all text-left cursor-pointer ${activeDoc?.name === doc.name ? 'bg-indigo-50/50 border-indigo-200' : 'bg-slate-50/55 hover:bg-slate-50 border-slate-100'}`}
                      >
                        <div className="space-y-0.5 max-w-[80%]">
                          <p className="font-bold text-slate-800 truncate">{doc.name}</p>
                          <p className="text-[9px] text-slate-400 font-semibold truncate">{doc.desc}</p>
                        </div>
                        <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                      </button>
                    ))}
                  </div>

                  {/* Right Document Preview Box */}
                  <div className="md:col-span-3 border border-slate-150 rounded-xl p-4 bg-slate-50/45 flex flex-col justify-between space-y-4 min-h-[220px]">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-150 pb-2">
                        <span className="font-bold text-indigo-650 uppercase tracking-wider text-[10px]">Document Previewer</span>
                        <button
                          onClick={() => handleDownloadDoc(activeDoc)}
                          className="inline-flex items-center space-x-1 rounded bg-white hover:bg-slate-50 border border-slate-200 px-2 py-1 text-[10px] font-bold text-slate-650 transition-all shadow-3xs cursor-pointer"
                        >
                          <Download className="h-3 w-3" />
                          <span>Download</span>
                        </button>
                      </div>

                      {/* Mock Certificate Visual Render */}
                      <div className="border border-slate-200/60 bg-white rounded-lg p-4 shadow-3xs relative overflow-hidden font-sans space-y-2">
                        <div className="absolute top-0 right-0 p-1 bg-indigo-50 border-bl border-indigo-100 text-[8px] font-bold text-indigo-600 rounded-bl">
                          E-KYC PORTAL
                        </div>
                        <h5 className="font-bold text-[10px] text-slate-800 border-b border-slate-100 pb-1 flex items-center space-x-1">
                          <Shield className="h-3.5 w-3.5 text-indigo-500" />
                          <span>OFFICIAL DIGITAL VERIFICATION COPY</span>
                        </h5>
                        <p className="text-[10px] text-slate-650 leading-relaxed font-semibold">
                          Certified copy verifying the <strong className="text-slate-800">{activeDoc?.name}</strong> issued for applicant <strong className="text-slate-800">{selectedApp?.beneficiary?.name || 'Beneficiary'}</strong>.
                        </p>
                        <div className="text-[9px] bg-slate-50 p-2 rounded text-slate-600 font-mono space-y-0.5">
                          <p><strong>Aadhaar UID:</strong> XXXX-XXXX-{selectedApp?.beneficiary?.uniqueIdNumber?.slice(-4) || '1234'}</p>
                          <p><strong>Registry Ref:</strong> REF-DBT-{selectedApp.id}-098</p>
                          <p><strong>Metadata Hash:</strong> sha256_e7f3a91b2c45</p>
                        </div>
                        <div className="text-[8px] font-bold text-emerald-600 flex items-center space-x-1 pt-1">
                          <CheckCircle className="h-3 w-3 shrink-0" />
                          <span>ELECTRONIC SIGNATURE VALID: SIGNED BY FIELD AUDITOR OFFICE</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-[9px] text-slate-400 font-medium italic text-center">
                      * All documents are pre-verified via UIDAI Aadhaar Vault & DigiLocker e-sign checks.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right side workspace panel */}
            <div className="space-y-6">
              {/* Eligibility Report */}
              <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm space-y-3.5">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-50 pb-1">Eligibility Report</h4>
                <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-xl p-4 border border-slate-800 text-xs space-y-3 relative overflow-hidden shadow-sm">
                  <div className="absolute right-0 top-0 h-16 w-16 bg-white/5 rounded-full translate-x-3 -translate-y-3"></div>
                  <div className="flex justify-between items-center"><span className="font-semibold text-slate-300">Eligibility score:</span><span className="text-lg font-black text-emerald-450">{selectedApp.eligibilityScore || 85} / 100</span></div>
                  <div className="border-t border-white/10 pt-2 text-[10px] space-y-1.5 font-medium text-slate-300">
                    <div className="flex items-center justify-between text-emerald-400"><span className="flex items-center"><Check className="h-3 w-3 mr-1" /> Aadhaar Verification</span><span>PASSED</span></div>
                    <div className="flex items-center justify-between text-emerald-400"><span className="flex items-center"><Check className="h-3 w-3 mr-1" /> Domicile Location Match</span><span>PASSED</span></div>
                    <div className="flex items-center justify-between text-emerald-400"><span className="flex items-center"><Check className="h-3 w-3 mr-1" /> Annual Income ceiling</span><span>PASSED</span></div>
                  </div>
                  <div className="border-t border-white/10 pt-2 flex justify-between items-center text-[10px]"><span className="font-semibold text-slate-300">AI Recommendation:</span><span className="font-bold text-emerald-400">RECOMMENDED FOR APPROVAL</span></div>
                </div>
              </div>

              {/* District Decision Panel */}
              <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm space-y-4">
                <h4 className="text-xs font-bold text-slate-850 uppercase tracking-wider">District Decision Panel</h4>
                {reviewMode === 'view' ? (
                  <div className="bg-slate-50 rounded-xl p-4 text-xs font-bold text-slate-500 border border-slate-150 text-center leading-relaxed">
                    ℹ️ Viewing Mode — decision actions are restricted. Go back to queue to perform review actions.
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Decision Remarks *</label>
                      <textarea
                        rows={3}
                        value={reviewRemarks}
                        onChange={(e) => setReviewRemarks(e.target.value)}
                        placeholder="Remarks are mandatory before submitting any decision..."
                        className="w-full rounded-lg border border-slate-200 p-2.5 text-xs outline-none focus:border-indigo-500"
                      />
                    </div>
                    {reviewRemarks.trim() === '' && (
                      <p className="text-[9px] text-rose-500 font-bold">⚠️ You must enter remarks to submit a decision.</p>
                    )}
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Rejection Reason (If rejecting)</label>
                      <input
                        type="text"
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        placeholder="Specify rejection details..."
                        className="h-9 w-full rounded-lg border border-slate-200 px-3 text-xs outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div className="grid gap-2 grid-cols-2">
                      <button
                        onClick={() => {
                          if (!reviewRemarks.trim()) {
                            alert('Remarks are mandatory before submitting any decision.');
                            return;
                          }
                          setShowApproveConfirm(true);
                        }}
                        disabled={submitting}
                        className="h-9 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-[11px] font-bold text-white shadow-sm flex items-center justify-center space-x-1 transition-all disabled:opacity-50 cursor-pointer"
                      >
                        <Check className="h-3.5 w-3.5" />
                        <span>Approve</span>
                      </button>
                      <button
                        onClick={() => {
                          if (!reviewRemarks.trim()) {
                            alert('Remarks are mandatory before submitting any decision.');
                            return;
                          }
                          setShowRejectConfirm(true);
                        }}
                        disabled={submitting}
                        className="h-9 rounded-lg bg-rose-600 hover:bg-rose-700 text-[11px] font-bold text-white shadow-sm flex items-center justify-center space-x-1 transition-all disabled:opacity-50 cursor-pointer"
                      >
                        <X className="h-3.5 w-3.5" />
                        <span>Reject</span>
                      </button>
                      <button
                        onClick={() => {
                          if (!reviewRemarks.trim()) {
                            alert('Remarks are mandatory before submitting any decision.');
                            return;
                          }
                          setShowCorrectConfirm(true);
                        }}
                        disabled={submitting}
                        className="h-9 rounded-lg bg-amber-500 hover:bg-amber-600 text-[11px] font-bold text-white shadow-sm flex items-center justify-center space-x-1 transition-all disabled:opacity-50 cursor-pointer"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        <span>Correct</span>
                      </button>
                      <button
                        onClick={() => {
                          if (!reviewRemarks.trim()) {
                            alert('Remarks are mandatory before submitting any decision.');
                            return;
                          }
                          setShowDocsConfirm(true);
                        }}
                        disabled={submitting}
                        className="h-9 rounded-lg bg-indigo-650 hover:bg-indigo-700 text-[11px] font-bold text-white shadow-sm flex items-center justify-center space-x-1 transition-all disabled:opacity-50 cursor-pointer"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        <span>Request Docs</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modals */}
      {showApproveConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-100 p-6 max-w-sm w-full mx-4 shadow-xl space-y-4">
            <h4 className="text-base font-black text-slate-800">Confirm Approve Decision</h4>
            <p className="text-xs text-slate-505 leading-relaxed">
              Are you sure you want to approve application <strong>{selectedApp?.applicationNumber}</strong>? This transitions status to <strong>DISTRICT_APPROVED</strong> and forwards to the Finance Officer.
            </p>
            <div className="flex justify-end space-x-2 pt-2">
              <button onClick={() => setShowApproveConfirm(false)} className="h-8 px-3 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-500 transition-all cursor-pointer">Cancel</button>
              <button onClick={() => submitAction('APPROVE')} disabled={submitting} className="h-8 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white transition-all disabled:opacity-50 cursor-pointer">{submitting ? 'Approving...' : 'Confirm Approval'}</button>
            </div>
          </div>
        </div>
      )}

      {showRejectConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-100 p-6 max-w-sm w-full mx-4 shadow-xl space-y-4">
            <h4 className="text-base font-black text-slate-800">Confirm Reject Decision</h4>
            <p className="text-xs text-slate-505 leading-relaxed">
              Are you sure you want to reject application <strong>{selectedApp?.applicationNumber}</strong>? This is a terminal action setting status to <strong>DISTRICT_REJECTED</strong>.
            </p>
            <div className="flex justify-end space-x-2 pt-2">
              <button onClick={() => setShowRejectConfirm(false)} className="h-8 px-3 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-500 transition-all cursor-pointer">Cancel</button>
              <button onClick={() => submitAction('REJECT')} disabled={submitting} className="h-8 px-4 rounded-lg bg-rose-600 hover:bg-rose-700 text-xs font-bold text-white transition-all disabled:opacity-50 cursor-pointer">{submitting ? 'Rejecting...' : 'Confirm Rejection'}</button>
            </div>
          </div>
        </div>
      )}

      {showCorrectConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-100 p-6 max-w-sm w-full mx-4 shadow-xl space-y-4">
            <h4 className="text-base font-black text-slate-800">Confirm Send Back</h4>
            <p className="text-xs text-slate-505 leading-relaxed">
              Are you sure you want to return application <strong>{selectedApp?.applicationNumber}</strong> to the field officer for clarification? Status becomes <strong>CORRECTION_REQUIRED</strong>.
            </p>
            <div className="flex justify-end space-x-2 pt-2">
              <button onClick={() => setShowCorrectConfirm(false)} className="h-8 px-3 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-500 transition-all cursor-pointer">Cancel</button>
              <button onClick={() => submitAction('REQUEST_REVERIFICATION')} disabled={submitting} className="h-8 px-4 rounded-lg bg-amber-500 hover:bg-amber-600 text-xs font-bold text-white transition-all disabled:opacity-50 cursor-pointer">{submitting ? 'Submitting...' : 'Confirm Correction'}</button>
            </div>
          </div>
        </div>
      )}

      {showDocsConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-100 p-6 max-w-sm w-full mx-4 shadow-xl space-y-4">
            <h4 className="text-base font-black text-slate-800">Confirm Request Docs</h4>
            <p className="text-xs text-slate-505 leading-relaxed">
              Are you sure you want to request additional documents for application <strong>{selectedApp?.applicationNumber}</strong>? Status will be updated to <strong>CORRECTION_REQUIRED</strong>.
            </p>
            <div className="flex justify-end space-x-2 pt-2">
              <button onClick={() => setShowDocsConfirm(false)} className="h-8 px-3 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-500 transition-all cursor-pointer">Cancel</button>
              <button onClick={() => submitAction('REQUEST_ADDITIONAL_DOCS')} disabled={submitting} className="h-8 px-4 rounded-lg bg-indigo-650 hover:bg-indigo-700 text-xs font-bold text-white transition-all disabled:opacity-50 cursor-pointer">{submitting ? 'Submitting...' : 'Confirm Request'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
