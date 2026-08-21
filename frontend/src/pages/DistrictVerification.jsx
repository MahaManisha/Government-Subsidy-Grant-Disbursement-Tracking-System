import React, { useState, useEffect } from 'react';
import { Search, ChevronLeft, ChevronRight, BookOpen, Clock, Check, CheckCircle, XCircle, FileText, User, MessageSquare, Shield, MapPin, ArrowRight } from 'lucide-react';
import axiosInstance from '../api/axiosInstance';
import LoadingSpinner from '../components/LoadingSpinner';
import { useRole } from '../layouts/ProtectedLayout';

export default function DistrictVerification() {
  const auth = useRole();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterScheme, setFilterScheme] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get('/v1/applications');
      if (res.data && res.data.success) {
        setApplications(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load verification queue:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const fetchVerificationHistory = async (appId) => {
    if (!appId) {
      setHistory([]);
      return;
    }
    setHistoryLoading(true);
    try {
      const historyRes = await axiosInstance.get(`/v1/applications/${appId}/verification/history`);
      if (historyRes.data && historyRes.data.success) {
        const sorted = (historyRes.data.data || []).sort(
          (a, b) => new Date(a.actionDate || a.createdAt) - new Date(b.actionDate || b.createdAt)
        );
        setHistory(sorted);
      } else {
        setHistory([]);
      }
    } catch (err) {
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleSelectApp = (app) => {
    setSelectedApp(app);
    fetchVerificationHistory(app.id);
  };

  const getDistrictDecision = (app) => {
    if (app.currentStage === 'FINANCE_REVIEW' || ['APPROVED', 'DISBURSED', 'READY_FOR_DISBURSEMENT'].includes(app.workflowStatus)) {
      return 'APPROVED';
    }
    if (app.workflowStatus === 'REJECTED' || app.workflowStatus === 'DISTRICT_REJECTED') {
      return 'REJECTED';
    }
    if (app.workflowStatus === 'RE_VERIFICATION_REQUESTED' || app.workflowStatus === 'CORRECTION_REQUIRED') {
      return 'RETURNED';
    }
    return 'PENDING';
  };

  const getDecisionDate = (app) => {
    const decision = getDistrictDecision(app);
    if (decision === 'PENDING') return '—';
    return app.lastModifiedDate
      ? new Date(app.lastModifiedDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
      : '—';
  };

  // Filter applications — Exclude SUBMITTED, INITIATION, ELIGIBILITY_PENDING, FIELD_VERIFICATION_PENDING
  const filteredList = applications.filter(a => {
    const excludeStages = ['INITIATION', 'FIELD_VERIFICATION'];
    const excludeStatuses = ['SUBMITTED', 'ELIGIBILITY_PENDING', 'FIELD_VERIFICATION_PENDING'];
    if (excludeStages.includes(a.currentStage) || excludeStatuses.includes(a.workflowStatus)) {
      return false;
    }

    const searchLower = searchTerm.toLowerCase();
    const idMatch = a.applicationNumber?.toLowerCase().includes(searchLower);
    const nameMatch = a.beneficiary?.name
      ? a.beneficiary.name.toLowerCase().includes(searchLower)
      : `${a.beneficiary?.firstName || ''} ${a.beneficiary?.lastName || ''}`.toLowerCase().includes(searchLower);
    const schemeMatch = a.scheme?.name?.toLowerCase().includes(searchLower);

    if (searchTerm && !(idMatch || nameMatch || schemeMatch)) return false;

    if (filterScheme && a.scheme?.name !== filterScheme) return false;

    if (filterStatus) {
      const decision = getDistrictDecision(a);
      if (filterStatus === 'PENDING' && decision !== 'PENDING') return false;
      if (filterStatus === 'APPROVED' && decision !== 'APPROVED') return false;
      if (filterStatus === 'REJECTED' && decision !== 'REJECTED') return false;
      if (filterStatus === 'RETURNED' && decision !== 'RETURNED') return false;
    }

    return true;
  });

  const uniqueSchemes = [...new Set(applications.map(a => a.scheme?.name).filter(Boolean))];

  const totalPages = Math.ceil(filteredList.length / itemsPerPage) || 1;
  const paginatedList = filteredList.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const getSimulatedDocuments = (app) => {
    const name = app?.scheme?.name?.toLowerCase() || '';
    const docs = [
      { name: 'Aadhaar Card Copy', desc: `UID Number: ${app?.beneficiary?.uniqueIdNumber || 'Verified'}` },
      { name: 'Income Certificate', desc: `Annual Income: ₹${app?.beneficiary?.annualIncome?.toLocaleString() || 'N/A'}` },
      { name: 'Residence Certificate', desc: `Residency: ${app?.beneficiary?.district || ''}, ${app?.beneficiary?.state || ''}` },
      { name: 'Bank Details Passbook', desc: `A/C Number: ${app?.beneficiary?.bankAccountNumber || 'Linked'}` }
    ];
    if (name.includes('kisan') || name.includes('farm') || name.includes('crop') || name.includes('agriculture')) {
      docs.push({ name: 'Land Possession Certificate (7/12 Extract)', desc: 'Land survey verified by field officer.' });
    }
    return docs;
  };

  const getPriority = (app) => {
    if (app.priority) return app.priority;
    if (app.beneficiary?.annualIncome <= 150000) return 'HIGH';
    if (app.beneficiary?.annualIncome <= 300000) return 'MEDIUM';
    return 'LOW';
  };

  const handleDownloadDoc = (doc) => {
    const name = selectedApp?.beneficiary?.name || 
      (selectedApp?.beneficiary?.user?.firstName ? `${selectedApp.beneficiary.user.firstName} ${selectedApp.beneficiary.user.lastName || ''}`.trim() : `${selectedApp?.beneficiary?.firstName || ''} ${selectedApp?.beneficiary?.lastName || ''}`.trim()) || 'N/A';
    const content = `GOVERNMENT OF INDIA - DBT PORTAL DOCUMENT DOWNLOAD
--------------------------------------------------
Document Type: ${doc.name}
Applicant Name: ${name}
Aadhaar Number: ${selectedApp?.beneficiary?.uniqueIdNumber || '—'}
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
        <span className="text-xs text-slate-400 font-semibold mt-3">Loading verification history database...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-800 md:text-3xl">Verification History</h1>
          <p className="text-slate-500 mt-1">Audit verification timeline reports, physical geotag logs, and previous review logs.</p>
        </div>
      </div>

      {!selectedApp ? (
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Verification History Logs</h3>
          </div>

          {/* Filters */}
          <div className="grid gap-3 sm:grid-cols-4 text-xs">
            <div className="space-y-1">
              <label className="font-bold text-slate-400 uppercase tracking-wider block text-[10px]">Filter by Scheme</label>
              <select value={filterScheme} onChange={(e) => setFilterScheme(e.target.value)} className="h-9 w-full rounded-lg border border-slate-200 px-2 outline-none focus:border-indigo-500 bg-white">
                <option value="">All Schemes</option>
                {uniqueSchemes.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="font-bold text-slate-400 uppercase tracking-wider block text-[10px]">District Decision</label>
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="h-9 w-full rounded-lg border border-slate-200 px-2 outline-none focus:border-indigo-500 bg-white">
                <option value="">All Decisions</option>
                <option value="PENDING">Pending Review</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
                <option value="RETURNED">Returned for Correction</option>
              </select>
            </div>
            <div className="space-y-1 sm:col-span-2">
              <label className="font-bold text-slate-400 uppercase tracking-wider block text-[10px]">Search ID or Beneficiary</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search Case Number, Beneficiary..."
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                  className="h-9 w-full rounded-lg border border-slate-200 pl-8 pr-2 text-xs outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Table */}
          {paginatedList.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-xs border border-dashed border-slate-100 rounded-xl">
              No matching verification history records found.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs text-slate-500">
                  <thead className="bg-slate-50 font-bold uppercase tracking-wider text-slate-500 border-b border-slate-150">
                    <tr>
                      <th className="px-4 py-3">Application ID</th>
                      <th className="px-4 py-3">Beneficiary</th>
                      <th className="px-4 py-3">Scheme</th>
                      <th className="px-4 py-3">Field Officer</th>
                      <th className="px-4 py-3">District Decision</th>
                      <th className="px-4 py-3">Remarks</th>
                      <th className="px-4 py-3">Decision Date</th>
                      <th className="px-4 py-3 text-center">Current Status</th>
                      <th className="px-4 py-3 text-center">Audit Registry</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-semibold">
                    {paginatedList.map((app) => {
                      const decision = getDistrictDecision(app);
                      const officerName = app.assignedOfficer
                        ? `${app.assignedOfficer.firstName} ${app.assignedOfficer.lastName}`
                        : '—';
                      return (
                        <tr key={app.id} className="hover:bg-slate-50/40 transition-all">
                          <td className="px-4 py-3.5 font-bold text-indigo-650 font-mono">{app.applicationNumber}</td>
                          <td className="px-4 py-3.5 text-slate-800">
                            {app.beneficiary?.name || `${app.beneficiary?.firstName || ''} ${app.beneficiary?.lastName || ''}`.trim() || '—'}
                          </td>
                          <td className="px-4 py-3.5 text-slate-655 truncate max-w-[150px]">{app.scheme?.name || 'N/A'}</td>
                          <td className="px-4 py-3.5 text-slate-500">{officerName}</td>
                          <td className="px-4 py-3.5">
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-bold ${decision === 'APPROVED' ? 'bg-emerald-50 text-emerald-700' : decision === 'REJECTED' ? 'bg-rose-50 text-rose-700' : decision === 'RETURNED' ? 'bg-amber-55 text-amber-800' : 'bg-slate-100 text-slate-600'}`}>
                              {decision}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-slate-550 italic max-w-[180px] truncate">{app.remarks || '—'}</td>
                          <td className="px-4 py-3.5 text-slate-500">{getDecisionDate(app)}</td>
                          <td className="px-4 py-3.5 text-center">
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-bold ${app.workflowStatus === 'APPROVED' || app.workflowStatus === 'DISBURSED' || app.workflowStatus === 'DISTRICT_APPROVED' ? 'bg-emerald-50 text-emerald-700' : app.workflowStatus === 'REJECTED' || app.workflowStatus === 'DISTRICT_REJECTED' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'}`}>
                              {app.workflowStatus || 'UNDER_REVIEW'}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <button onClick={() => handleSelectApp(app)} className="inline-flex items-center space-x-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 text-[10px] font-bold text-indigo-650 transition-all cursor-pointer">
                              <span>Open Audit Report</span>
                              <ArrowRight className="h-3 w-3" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
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
        /* Workspace review details view */
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <button onClick={() => setSelectedApp(null)} className="inline-flex items-center space-x-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-655 hover:bg-slate-50 shadow-sm transition-all cursor-pointer">
              <ChevronLeft className="h-4 w-4" />
              <span>Back to Verification History</span>
            </button>
            <div className="text-right">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Auditing Case file</span>
              <h2 className="text-lg font-black text-slate-800">{selectedApp.applicationNumber}</h2>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Left Col: FO reports and verified docs */}
            <div className="lg:col-span-2 space-y-6">
              {/* Verification status & Previous Decisions */}
              <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm space-y-4">
                <div className="flex items-center space-x-2 border-b border-slate-50 pb-2.5">
                  <Shield className="h-5 w-5 text-indigo-500" />
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Verification Remarks & Status</h3>
                </div>
                <div className="grid gap-4 sm:grid-cols-3 text-xs leading-relaxed">
                  <div className="bg-slate-50 rounded-xl p-3"><span className="text-slate-400 block font-semibold mb-0.5">Verification stage</span><span className="font-bold text-slate-800 text-sm">{selectedApp.currentStage}</span></div>
                  <div className="bg-slate-50 rounded-xl p-3"><span className="text-slate-400 block font-semibold mb-0.5">Workflow Status</span><span className="font-bold text-slate-800 text-sm">{selectedApp.workflowStatus || 'UNDER_REVIEW'}</span></div>
                  <div className="bg-slate-50 rounded-xl p-3"><span className="text-slate-400 block font-semibold mb-0.5">Priority Level</span><span className="font-bold text-slate-800 text-sm">{getPriority(selectedApp)}</span></div>
                  <div className="bg-slate-50 rounded-xl p-3 sm:col-span-3"><span className="text-slate-400 block font-semibold mb-0.5">District Officer Remarks / Decisions</span><span className="font-semibold text-slate-750">{selectedApp.remarks || 'No remarks recorded.'}</span></div>
                </div>
              </div>

              {/* Field Officer report */}
              <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm space-y-4">
                <div className="flex items-center space-x-2 border-b border-slate-50 pb-2.5">
                  <User className="h-5 w-5 text-indigo-500" />
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Field Officer report</h3>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 text-xs leading-relaxed">
                  <div className="bg-slate-50 rounded-xl p-3"><span className="text-slate-400 block font-semibold mb-0.5">Auditing Inspector</span><span className="font-bold text-slate-800">{selectedApp.assignedOfficer ? `${selectedApp.assignedOfficer.firstName} ${selectedApp.assignedOfficer.lastName}` : '—'}</span></div>
                  <div className="bg-slate-50 rounded-xl p-3"><span className="text-slate-400 block font-semibold mb-0.5">Inspection date</span><span className="font-bold text-slate-800">{selectedApp.verifiedDate ? new Date(selectedApp.verifiedDate).toLocaleDateString() : '—'}</span></div>
                  <div className="bg-slate-55 rounded-xl p-3 sm:col-span-2"><span className="text-slate-400 block font-semibold mb-0.5">Inspection Remarks</span><span className="font-semibold text-slate-705 italic">{selectedApp.remarks ? `"${selectedApp.remarks}"` : '—'}</span></div>
                  
                  {/* Photo geotags */}
                  {selectedApp.geotagLatitude && (
                    <div className="border border-slate-150 rounded-xl p-3 bg-slate-50/50 flex items-center space-x-3 sm:col-span-2">
                      <div className="h-9 w-9 bg-indigo-50 border border-indigo-150 rounded-lg flex items-center justify-center text-indigo-500 shrink-0">
                        <MapPin className="h-5 w-5" />
                      </div>
                      <div className="text-[9px] text-slate-500 font-mono space-y-0.5 leading-tight">
                        <p className="font-bold text-slate-700">Geotag Coordinates</p>
                        <p>Latitude: {selectedApp.geotagLatitude}° N</p>
                        <p>Longitude: {selectedApp.geotagLongitude}° E</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Verification Documents Checklist */}
              <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm space-y-4">
                <div className="flex items-center space-x-2 border-b border-slate-50 pb-2.5">
                  <FileText className="h-5 w-5 text-indigo-500" />
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Uploaded Verification Documents</h3>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 text-xs">
                  {getSimulatedDocuments(selectedApp).map((doc, idx) => (
                    <div key={idx} className="flex items-center justify-between border border-slate-100 rounded-xl p-3 bg-slate-50/50">
                      <div className="space-y-0.5">
                        <p className="font-bold text-slate-800">{doc.name}</p>
                        <p className="text-[9px] text-slate-400 font-semibold">{doc.desc}</p>
                      </div>
                      <span className="inline-flex items-center space-x-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[9px] font-bold text-emerald-700 border border-emerald-100">
                        <Check className="h-2.5 w-2.5" />
                        <span>VERIFIED</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Col: Timeline */}
            <div className="space-y-6">
              <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm space-y-4">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-50 pb-1">Audit Trail Chronology</h4>
                {historyLoading ? (
                  <div className="flex justify-center py-4"><LoadingSpinner size="small" /></div>
                ) : history.length === 0 ? (
                  <div className="py-4 text-center text-slate-400 text-xs">No history timeline events found.</div>
                ) : (
                  <div className="relative border-l border-slate-150 pl-4 space-y-4 ml-1.5">
                    {history.map((step, i) => (
                      <div key={step.id || i} className="relative text-[10px] space-y-0.5 leading-relaxed">
                        <span className="absolute -left-6 top-1.5 h-2.5 w-2.5 rounded-full bg-indigo-500 border-2 border-white shadow-xs"></span>
                        <div className="flex justify-between text-slate-800 font-bold">
                          <span className="uppercase">{step.status?.replace(/_/g, ' ') || 'ACTION'}</span>
                          <span className="text-[9px] text-slate-400">
                            {step.actionDate ? new Date(step.actionDate).toLocaleDateString() : 'N/A'}
                          </span>
                        </div>
                        {step.officer && (
                          <p className="text-[9px] text-slate-400 font-bold">
                            Officer: {step.officer.firstName} {step.officer.lastName} (@{step.officer.username})
                          </p>
                        )}
                        {step.remarks && (
                          <p className="text-slate-500 italic text-[9px] bg-slate-50 p-1.5 rounded border border-slate-100/50 mt-1">
                            "{step.remarks}"
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
