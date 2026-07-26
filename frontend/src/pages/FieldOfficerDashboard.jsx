import React, { useState, useEffect } from 'react';
import { Search, ChevronLeft, ChevronRight, BookOpen, Clock, Check, CheckCircle, XCircle, ArrowRight, FileText, User, Shield, MapPin, Download, Eye, Calendar, Bell, ShieldAlert, Award, RefreshCw, X } from 'lucide-react';
import axiosInstance from '../api/axiosInstance';
import LoadingSpinner from '../components/LoadingSpinner';
import { useRole } from '../layouts/ProtectedLayout';

import { exportApplicationsCSV } from '../api/exportHelper';

export default function FieldOfficerDashboard() {
  const auth = useRole();
  const [applications, setApplications] = useState([]);
  const [officers, setOfficers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedApp, setSelectedApp] = useState(null);
  const [activeDoc, setActiveDoc] = useState(null);

  // Form states for Field Inspection
  const [inspectionDate, setInspectionDate] = useState(new Date().toISOString().split('T')[0]);
  const [inspectionLocation, setInspectionLocation] = useState('Gandhinagar Rural Division');
  const [gpsLatitude, setGpsLatitude] = useState('23.2156');
  const [gpsLongitude, setGpsLongitude] = useState('72.6369');
  const [remarks, setRemarks] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [photoUrl, setPhotoUrl] = useState('https://images.unsplash.com/photo-1590069261209-f8e9b8642343');

  // Confirmation modal triggers
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const [showDocsConfirm, setShowDocsConfirm] = useState(false);
  const [showRevisitConfirm, setShowRevisitConfirm] = useState(false);

  // Search/Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');

  const [currentUserProfile, setCurrentUserProfile] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      // Fetch all applications from the real backend API only
      const appsRes = await axiosInstance.get('/v1/applications');
      if (appsRes.data && appsRes.data.success) {
        setApplications(appsRes.data.data || []);
      } else {
        setApplications([]);
      }
      // Fetch current officer profile to resolve officer ID securely
      try {
        const meRes = await axiosInstance.get('/v1/users/me');
        if (meRes.data && meRes.data.success) {
          setCurrentUserProfile(meRes.data.data);
        }
      } catch (meErr) {
        console.warn('Failed to fetch /v1/users/me:', meErr);
      }
    } catch (err) {
      console.error('Failed to load Field Officer workspace:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const currentUsername = auth?.user?.username || currentUserProfile?.username;
  const actingOfficerId = auth?.user?.id || currentUserProfile?.id || null;
  const actingOfficerName = currentUserProfile
    ? `${currentUserProfile.firstName || ''} ${currentUserProfile.lastName || ''}`.trim() || currentUsername
    : (currentUsername || 'Field Officer');

  // Applications currently assigned to logged-in Field Officer pending verification
  const pendingApps = applications.filter(a => {
    if (!a.assignedOfficer) return false;
    if (a.workflowStatus === 'ELIGIBILITY_REJECTED' || a.workflowStatus === 'REJECTED' || a.eligibilityResult === 'NOT_ELIGIBLE') return false;
    const officerUsername = typeof a.assignedOfficer === 'object'
      ? a.assignedOfficer.username
      : a.assignedOfficer;
    const isMyOfficer = officerUsername && currentUsername && officerUsername === currentUsername;
    const isFieldStage = a.currentStage === 'FIELD_VERIFICATION' || a.currentStage === 'FIELD_VERIFICATION_PENDING';
    const isNotCompleted = a.workflowStatus !== 'FIELD_VERIFIED' && a.workflowStatus !== 'APPROVED' && a.workflowStatus !== 'REJECTED';
    return isMyOfficer && isFieldStage && isNotCompleted;
  });

  // All applications assigned to or completed/verified by logged-in Field Officer
  const assignedApps = applications.filter(a => {
    if (a.workflowStatus === 'ELIGIBILITY_REJECTED' || a.workflowStatus === 'REJECTED' || a.eligibilityResult === 'NOT_ELIGIBLE') return false;
    const isAssigned = a.assignedOfficer && (typeof a.assignedOfficer === 'object' ? a.assignedOfficer.username : a.assignedOfficer) === currentUsername;
    const isVerifiedByMe = (a.workflowStatus === 'FIELD_VERIFIED' || a.currentStage === 'DISTRICT_REVIEW_PENDING' || a.currentStage === 'DISTRICT_REVIEW') && (a.verifiedDate != null || a.lastModifiedDate != null);
    return isAssigned || isVerifiedByMe;
  });

  // Calculate dynamic metrics
  const countAssigned = pendingApps.length;
  const countPending = pendingApps.length;
  
  const todayStr = new Date().toDateString();
  const countCompletedToday = applications.filter(a => {
    if (!a.lastModifiedDate && !a.verifiedDate) return false;
    const modDate = a.verifiedDate || a.lastModifiedDate;
    const isCompleted = a.workflowStatus === 'FIELD_VERIFIED' || a.currentStage === 'DISTRICT_REVIEW_PENDING' || a.currentStage === 'DISTRICT_REVIEW' || a.currentStage === 'FINANCE_REVIEW_PENDING' || a.currentStage === 'FINANCE_REVIEW' || a.currentStage === 'COMPLETED' || a.workflowStatus === 'APPROVED';
    return isCompleted && new Date(modDate).toDateString() === todayStr;
  }).length;

  const countRevisit = applications.filter(a => {
    const isMyOfficer = a.assignedOfficer && (typeof a.assignedOfficer === 'object' ? a.assignedOfficer.username : a.assignedOfficer) === currentUsername;
    return isMyOfficer && (a.workflowStatus === 'RE_VERIFICATION_REQUESTED' || a.workflowStatus === 'CORRECTION_REQUIRED');
  }).length;
  
  const overdueLimit = new Date();
  overdueLimit.setDate(overdueLimit.getDate() - 5);
  const countOverdue = pendingApps.filter(a => a.submittedDate && new Date(a.submittedDate) < overdueLimit).length;

  // Calculate dynamic turnaround time
  const calculateAvgTime = () => {
    const verifiedList = applications.filter(a => a.submittedDate && (a.verifiedDate || a.lastModifiedDate) && (a.workflowStatus === 'FIELD_VERIFIED' || a.currentStage === 'DISTRICT_REVIEW_PENDING' || a.currentStage === 'DISTRICT_REVIEW'));
    if (verifiedList.length === 0) return '0.0 Days';
    let totalDays = 0;
    verifiedList.forEach(a => {
      const start = new Date(a.submittedDate);
      const end = new Date(a.verifiedDate || a.lastModifiedDate);
      const days = Math.max(0.1, (end - start) / (1000 * 60 * 60 * 24));
      totalDays += days;
    });
    return (totalDays / verifiedList.length).toFixed(1) + ' Days';
  };
  const avgVerificationTime = calculateAvgTime();

  const handleVerifyClick = (app) => {
    setSelectedApp(app);
    setRemarks('');
    setRejectionReason('');
    const location = app.beneficiary?.district
      ? `${app.beneficiary.district} Division`
      : (app.beneficiary?.address || 'Field Inspection Site');
    setInspectionLocation(location);
    setGpsLatitude('23.2156');
    setGpsLongitude('72.6369');
    setPhotoUrl('https://images.unsplash.com/photo-1590069261209-f8e9b8642343');
    const docs = getSimulatedDocuments(app);
    setActiveDoc(docs[0]);
  };

  const submitAction = async (actionType) => {
    if (!remarks.trim()) {
      alert('Remarks are required for all verification actions.');
      return;
    }

    setSubmitting(true);

    let backendAction = 'APPROVE';
    if (actionType === 'REJECT') {
      backendAction = 'REJECT';
    } else if (actionType === 'REQUEST_ADDITIONAL_DOCS') {
      backendAction = 'REQUEST_DOCUMENTS';
    } else if (actionType === 'SCHEDULE_REVISIT') {
      backendAction = 'REQUEST_REVERIFICATION';
    }

    const payload = {
      officerId: actingOfficerId ? Number(actingOfficerId) : null,
      action: backendAction,
      remarks: remarks,
      rejectionReason: actionType === 'REJECT' ? (rejectionReason || remarks) : null
    };

    try {
      const response = await axiosInstance.post(
        `/v1/applications/${selectedApp.id}/verification/field-verify`,
        payload
      );

      if (response.data && response.data.success) {
        // Reset form and modal state
        setSelectedApp(null);
        setShowApproveConfirm(false);
        setShowRejectConfirm(false);
        setShowDocsConfirm(false);
        setShowRevisitConfirm(false);
        setRemarks('');
        setRejectionReason('');
        // Re-fetch fresh data from the backend — no localStorage involved
        await loadData();
        alert(`Verification action submitted successfully: ${actionType}`);
      }
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Verification submission failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const getSimulatedDocuments = (app) => {
    const name = app?.scheme?.name?.toLowerCase() || '';
    const docs = [
      { name: 'Aadhaar Card Copy', desc: `UID Number: ${app?.beneficiary?.uniqueIdNumber || 'Verified'}` },
      { name: 'Income Certificate', desc: `Annual Income: ₹${app?.beneficiary?.annualIncome?.toLocaleString() || 'N/A'}` },
      { name: 'Residence Certificate', desc: `Residency: ${app?.beneficiary?.district || 'Gandhinagar'}, ${app?.beneficiary?.state || 'Gujarat'}` },
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
    const name = selectedApp?.beneficiary?.name || `${selectedApp?.beneficiary?.firstName || ''} ${selectedApp?.beneficiary?.lastName || ''}`;
    const content = `GOVERNMENT OF INDIA - DBT PORTAL DOCUMENT DOWNLOAD
--------------------------------------------------
Document Type: ${doc.name}
Applicant Name: ${name}
Aadhaar Number: ${selectedApp?.beneficiary?.uniqueIdNumber}
Details: ${doc.desc}
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

  const handleExport = (reportType) => {
    let dataToExport = [];
    let title = "field_report";
    if (reportType === 'TODAY') {
      dataToExport = applications.filter(a => {
        if (!a.lastModifiedDate) return false;
        const isVerified = a.workflowStatus === 'FIELD_VERIFIED' || a.currentStage === 'DISTRICT_REVIEW_PENDING' || a.currentStage === 'DISTRICT_REVIEW';
        return isVerified && new Date(a.lastModifiedDate).toDateString() === todayStr;
      });
      title = "field_today_verifications";
    } else if (reportType === 'WEEKLY') {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      dataToExport = applications.filter(a => a.lastModifiedDate && new Date(a.lastModifiedDate) >= sevenDaysAgo);
      title = "field_weekly_verifications";
    } else if (reportType === 'MONTHLY') {
      const currentMonth = new Date().getMonth();
      dataToExport = applications.filter(a => a.lastModifiedDate && new Date(a.lastModifiedDate).getMonth() === currentMonth);
      title = "field_monthly_verifications";
    } else if (reportType === 'PENDING') {
      dataToExport = assignedApps.filter(a => (a.currentStage === 'FIELD_VERIFICATION' || a.currentStage === 'FIELD_VERIFICATION_PENDING') && a.workflowStatus !== 'FIELD_VERIFIED');
      title = "field_pending_verifications";
    }

    exportApplicationsCSV(dataToExport, title);
  };

  const appsToFilter = filterStatus === 'PENDING' ? pendingApps : assignedApps;
  const filteredApps = appsToFilter.filter(a => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = a.applicationNumber?.toLowerCase().includes(term) ||
      a.beneficiary?.name?.toLowerCase().includes(term) ||
      `${a.beneficiary?.firstName || ''} ${a.beneficiary?.lastName || ''}`.toLowerCase().includes(term) ||
      a.scheme?.name?.toLowerCase().includes(term);

    const matchesStatus = filterStatus === 'ALL' ||
      (filterStatus === 'PENDING' && (a.currentStage === 'FIELD_VERIFICATION' || a.currentStage === 'FIELD_VERIFICATION_PENDING') && a.workflowStatus !== 'FIELD_VERIFIED') ||
      (filterStatus === 'COMPLETED' && (a.workflowStatus === 'FIELD_VERIFIED' || a.currentStage === 'DISTRICT_REVIEW' || a.currentStage === 'DISTRICT_REVIEW_PENDING')) ||
      (filterStatus === 'REVISIT' && (a.workflowStatus === 'RE_VERIFICATION_REQUESTED' || a.workflowStatus === 'CORRECTION_REQUIRED'));

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-800 md:text-3xl">Field Officer Workspace</h1>
          <p className="text-slate-500 mt-1">Review assigned applications, perform on-site inspections, and audit compliance details.</p>
        </div>
        <div className="text-[11px] font-bold text-slate-505 bg-white border border-slate-200 rounded-lg px-3 py-2 flex items-center shadow-xs">
          Assigned Inspector: <span className="text-indigo-600 ml-1">@{auth?.user?.username || 'N/A'}</span>
        </div>
      </div>

      {!selectedApp ? (
        <>
          {/* Summary Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
            <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Assigned Files</p>
              <h3 className="mt-1 text-xl font-black text-slate-800">{countAssigned}</h3>
              <p className="text-[9px] font-semibold text-indigo-605 mt-1">Total active cases</p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Pending Verification</p>
              <h3 className="mt-1 text-xl font-black text-slate-800">{countPending}</h3>
              <p className="text-[9px] font-semibold text-amber-600 mt-1">Inspections due</p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Completed Today</p>
              <h3 className="mt-1 text-xl font-black text-slate-800">{countCompletedToday}</h3>
              <p className="text-[9px] font-semibold text-emerald-600 mt-1">Verified today</p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Revisit Required</p>
              <h3 className="mt-1 text-xl font-black text-slate-800">{countRevisit}</h3>
              <p className="text-[9px] font-semibold text-indigo-650 mt-1">Follow ups</p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Overdue Audits</p>
              <h3 className="mt-1 text-xl font-black text-slate-800">{countOverdue}</h3>
              <p className="text-[9px] font-semibold text-rose-600 mt-1">&gt; 5 days delay</p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Avg Verification</p>
              <h3 className="mt-1 text-xl font-black text-slate-800">{avgVerificationTime}</h3>
              <p className="text-[9px] font-semibold text-slate-500 mt-1">Field turnaround</p>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {/* Left side: Queue */}
            <div className="md:col-span-2 space-y-6">
              <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">My Assigned Inspections</h3>
                  <div className="flex gap-2 text-xs">
                    <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="h-8 rounded-lg border border-slate-200 px-2 outline-none focus:border-indigo-500 bg-white font-semibold">
                      <option value="ALL">All Statuses</option>
                      <option value="PENDING">Pending Verification</option>
                      <option value="COMPLETED">Completed</option>
                      <option value="REVISIT">Revisit Scheduled</option>
                    </select>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search ID, name..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="h-8 rounded-lg border border-slate-200 pl-8 pr-2 outline-none focus:border-indigo-500 text-xs"
                      />
                    </div>
                  </div>
                </div>

                {loading ? (
                  <div className="py-16 text-center">
                    <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent"></div>
                    <p className="text-xs text-slate-400 font-semibold mt-3">Loading your assigned applications…</p>
                  </div>
                ) : filteredApps.length === 0 ? (
                  <div className="py-16 flex flex-col items-center justify-center gap-4 text-center border border-dashed border-slate-200 rounded-xl">
                    <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center">
                      <FileText className="h-6 w-6 text-slate-300" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-700">
                        {assignedApps.length === 0
                          ? 'No Assigned Applications Found'
                          : 'No Results Match Your Filters'}
                      </p>
                      <p className="text-xs text-slate-400 mt-1 max-w-xs">
                        {assignedApps.length === 0
                          ? 'You currently have no applications pending field verification. New assignments will appear here automatically.'
                          : 'Try adjusting your search term or status filter to find matching records.'}
                      </p>
                    </div>
                    <button
                      onClick={loadData}
                      className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all cursor-pointer shadow-sm"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Refresh
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left text-xs text-slate-500">
                      <thead className="bg-slate-50 font-bold uppercase tracking-wider text-slate-500 border-b border-slate-150">
                        <tr>
                          <th className="px-3 py-3">Application ID</th>
                          <th className="px-3 py-3">Beneficiary</th>
                          <th className="px-3 py-3">Scheme</th>
                          <th className="px-3 py-3">District</th>
                          <th className="px-3 py-3">Date</th>
                          <th className="px-3 py-3 text-center">Priority</th>
                          <th className="px-3 py-3 text-center">Status</th>
                          <th className="px-3 py-3 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-semibold">
                        {filteredApps.map(app => {
                          const priority = getPriority(app);
                          const isVerifiable = app.currentStage === 'FIELD_VERIFICATION' && app.workflowStatus !== 'FIELD_VERIFIED';
                          return (
                            <tr key={app.id} className="hover:bg-slate-50/40 transition-all">
                              <td className="px-3 py-3.5 font-bold text-indigo-650">{app.applicationNumber}</td>
                              <td className="px-3 py-3.5 text-slate-800">{app.beneficiary?.name || `${app.beneficiary?.firstName || ''} ${app.beneficiary?.lastName || 'N/A'}`}</td>
                              <td className="px-3 py-3.5 text-slate-650 truncate max-w-[120px]">{app.scheme?.name || 'N/A'}</td>
                              <td className="px-3 py-3.5 text-slate-500">{app.beneficiary?.district || app.beneficiary?.state || '—'}</td>
                              <td className="px-3 py-3.5 text-slate-450">{app.submittedDate ? new Date(app.submittedDate).toLocaleDateString() : 'N/A'}</td>
                              <td className="px-3 py-3.5 text-center">
                                <span className={`inline-flex rounded px-1.5 py-0.5 text-[9px] font-bold ${priority === 'HIGH' ? 'bg-rose-105 text-rose-750' : 'bg-slate-100 text-slate-700'}`}>
                                  {priority}
                                </span>
                              </td>
                              <td className="px-3 py-3.5 text-center">
                                <span className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-bold ${app.workflowStatus === 'FIELD_VERIFIED' || app.currentStage === 'DISTRICT_REVIEW' ? 'bg-emerald-55 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                                  {app.workflowStatus || 'UNDER_REVIEW'}
                                </span>
                              </td>
                              <td className="px-3 py-3.5 text-center">
                                <button
                                  onClick={() => handleVerifyClick(app)}
                                  className={`inline-flex items-center space-x-1 rounded-lg px-2.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${isVerifiable ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs' : 'bg-slate-50 text-slate-500 border border-slate-200'}`}
                                >
                                  <span>{isVerifiable ? 'Verify' : 'View'}</span>
                                  <ArrowRight className="h-3.5 w-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Right side widgets: Tasks, Notifications, History, Reports */}
            <div className="md:col-span-1 space-y-6">
              {/* Tasks List */}
              <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm space-y-4">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-indigo-500" />
                  <span>My Tasks Queue</span>
                </h4>
                <div className="space-y-3.5 text-xs font-semibold">
                  <div className="flex items-center justify-between border-b border-slate-50 pb-2"><span className="text-slate-500">Applications Due Today</span><span className="text-rose-600 font-bold">{countPending}</span></div>
                  <div className="flex items-center justify-between border-b border-slate-50 pb-2"><span className="text-slate-500">Pending inspections</span><span className="text-amber-600 font-bold">{countPending}</span></div>
                  <div className="flex items-center justify-between border-b border-slate-50 pb-2"><span className="text-slate-500">Overdue inspections</span><span className="text-rose-600 font-bold">{countOverdue}</span></div>
                  <div className="flex items-center justify-between"><span className="text-slate-500">Scheduled revisits</span><span className="text-indigo-600 font-bold">{countRevisit}</span></div>
                </div>
              </div>

              {/* Notifications */}
              <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm space-y-4">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Bell className="h-4 w-4 text-indigo-500" />
                  <span>Inspections Feed</span>
                </h4>
                <div className="space-y-3.5 text-xs">
                  {countPending > 0 && (
                    <div className="flex gap-2.5 items-start bg-amber-50/50 p-2.5 rounded-lg border border-amber-100">
                      <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-slate-800">Pending Field Audits</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">You have {countPending} cases awaiting verification.</p>
                      </div>
                    </div>
                  )}
                  {countRevisit > 0 && (
                    <div className="flex gap-2.5 items-start bg-indigo-50/30 p-2.5 rounded-lg border border-indigo-100/60">
                      <RefreshCw className="h-4 w-4 text-indigo-500 shrink-0 mt-0.5 animate-spin-slow" />
                      <div>
                        <p className="font-bold text-slate-800">Revisit Scheduled</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">{countRevisit} file correction(s) requested.</p>
                      </div>
                    </div>
                  )}
                  {countPending === 0 && countRevisit === 0 && (
                    <p className="text-slate-400 font-semibold text-center py-4">No urgent notifications.</p>
                  )}
                </div>
              </div>

              {/* Reports */}
              <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm space-y-4">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Reports Exporter</h4>
                <div className="grid gap-2 grid-cols-2 text-[10px]">
                  <button onClick={() => handleExport('TODAY')} className="border rounded bg-white hover:bg-slate-50 py-2 font-bold text-slate-650 transition-all cursor-pointer">Today's Verified</button>
                  <button onClick={() => handleExport('WEEKLY')} className="border rounded bg-white hover:bg-slate-50 py-2 font-bold text-slate-650 transition-all cursor-pointer">Weekly Log</button>
                  <button onClick={() => handleExport('MONTHLY')} className="border rounded bg-white hover:bg-slate-50 py-2 font-bold text-slate-650 transition-all cursor-pointer">Monthly Log</button>
                  <button onClick={() => handleExport('PENDING')} className="border rounded bg-white hover:bg-slate-50 py-2 font-bold text-slate-650 transition-all cursor-pointer">Pending List</button>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        /* Detailed Verification Workspace */
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <button onClick={() => setSelectedApp(null)} className="inline-flex items-center space-x-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-650 hover:bg-slate-50 shadow-sm transition-all cursor-pointer">
              <ChevronLeft className="h-4 w-4" />
              <span>Back to Dashboard Workspace</span>
            </button>
            <div className="text-right">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Inspecting File Case</span>
              <h2 className="text-lg font-black text-slate-800">{selectedApp.applicationNumber}</h2>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Left side details */}
            <div className="lg:col-span-2 space-y-6">
              {/* Beneficiary Details */}
              <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm space-y-4">
                <div className="flex items-center space-x-2 border-b border-slate-50 pb-2.5">
                  <User className="h-5 w-5 text-indigo-500" />
                  <h3 className="text-xs font-bold text-slate-850 uppercase tracking-wider">Beneficiary Profile</h3>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 text-xs leading-relaxed">
                  <div className="bg-slate-50 rounded-xl p-3"><span className="text-slate-400 block font-semibold mb-0.5">Full Name</span><span className="font-bold text-slate-850 text-sm">{selectedApp.beneficiary?.name || `${selectedApp.beneficiary?.firstName || ''} ${selectedApp.beneficiary?.lastName || 'N/A'}`}</span></div>
                  <div className="bg-slate-50 rounded-xl p-3"><span className="text-slate-400 block font-semibold mb-0.5">Unique ID (Aadhaar)</span><span className="font-mono font-bold text-slate-750 text-sm">{selectedApp.beneficiary?.uniqueIdNumber || 'N/A'}</span></div>
                  <div className="bg-slate-50 rounded-xl p-3"><span className="text-slate-400 block font-semibold mb-0.5">Phone Number</span><span className="font-mono font-bold text-slate-750 text-sm">{selectedApp.beneficiary?.phoneNumber || 'N/A'}</span></div>
                  <div className="bg-slate-50 rounded-xl p-3"><span className="text-slate-400 block font-semibold mb-0.5">Annual Income</span><span className="font-bold text-slate-850 text-sm">₹{selectedApp.beneficiary?.annualIncome?.toLocaleString() || '0'}</span></div>
                  <div className="bg-slate-50 rounded-xl p-3"><span className="text-slate-400 block font-semibold mb-0.5">Category</span><span className="font-bold text-slate-850 text-sm">{selectedApp.beneficiary?.category || 'General'}</span></div>
                  <div className="bg-slate-50 rounded-xl p-3"><span className="text-slate-400 block font-semibold mb-0.5">Occupation (Self Declared)</span><span className="font-bold text-slate-850 text-sm">
                    {selectedApp?.scheme?.name?.toLowerCase().includes('kisan') || selectedApp?.scheme?.name?.toLowerCase().includes('farm') ? 'Farmer / Crop Producer' : 'Artisan / Small Business'}
                  </span></div>
                  <div className="bg-slate-50 rounded-xl p-3 sm:col-span-2"><span className="text-slate-400 block font-semibold mb-0.5">Address</span><span className="font-semibold text-slate-755">{selectedApp.beneficiary?.address || 'N/A'}, {selectedApp.beneficiary?.district || 'Gandhinagar'}, {selectedApp.beneficiary?.state || 'Gujarat'}</span></div>
                </div>
              </div>

              {/* Scheme Details */}
              <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm space-y-4">
                <div className="flex items-center space-x-2 border-b border-slate-50 pb-2.5">
                  <BookOpen className="h-5 w-5 text-indigo-500" />
                  <h3 className="text-xs font-bold text-slate-855 uppercase tracking-wider">Scheme Parameters</h3>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 text-xs leading-relaxed">
                  <div className="bg-slate-50 rounded-xl p-3 sm:col-span-2"><span className="text-slate-400 block font-semibold mb-0.5">Scheme Name</span><span className="font-bold text-slate-850 text-sm">{selectedApp.scheme?.name || 'N/A'}</span></div>
                  <div className="bg-slate-50 rounded-xl p-3"><span className="text-slate-400 block font-semibold mb-0.5">Eligibility check Score</span><span className="font-bold text-slate-850 text-sm">{selectedApp.eligibilityScore || 85} / 100</span></div>
                  <div className="bg-slate-50 rounded-xl p-3"><span className="text-slate-400 block font-semibold mb-0.5">Requested Amount</span><span className="font-bold text-indigo-650 text-sm">₹{selectedApp.requestedAmount?.toLocaleString()}</span></div>
                </div>
              </div>

              {/* Uploaded Documents */}
              <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm space-y-4">
                <div className="flex items-center space-x-2 border-b border-slate-50 pb-2.5">
                  <FileText className="h-5 w-5 text-indigo-500" />
                  <h3 className="text-xs font-bold text-slate-855 uppercase tracking-wider">Uploaded Documents</h3>
                </div>
                <div className="grid gap-4 md:grid-cols-5 text-xs">
                  <div className="md:col-span-2 space-y-2">
                    {getSimulatedDocuments(selectedApp).map((doc, idx) => (
                      <button
                        key={idx}
                        onClick={() => setActiveDoc(doc)}
                        className={`w-full flex items-center justify-between border rounded-xl p-3 transition-all text-left cursor-pointer ${activeDoc?.name === doc.name ? 'bg-indigo-50/50 border-indigo-200' : 'bg-slate-50/50 hover:bg-slate-50 border-slate-100'}`}
                      >
                        <div className="space-y-0.5 max-w-[80%]">
                          <p className="font-bold text-slate-800 truncate">{doc.name}</p>
                          <p className="text-[9px] text-slate-405 truncate">{doc.desc}</p>
                        </div>
                        <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                      </button>
                    ))}
                  </div>

                  <div className="md:col-span-3 border border-slate-150 rounded-xl p-4 bg-slate-50/30 flex flex-col justify-between space-y-4 min-h-[200px]">
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between border-b border-slate-150 pb-2">
                        <span className="font-bold text-indigo-650 uppercase tracking-wider text-[10px]">Document Vault Preview</span>
                        <button
                          onClick={() => handleDownloadDoc(activeDoc)}
                          className="inline-flex items-center space-x-1 rounded bg-white hover:bg-slate-50 border border-slate-200 px-2 py-1 text-[10px] font-bold text-slate-650 shadow-3xs cursor-pointer"
                        >
                          <Download className="h-3 w-3" />
                          <span>Download</span>
                        </button>
                      </div>

                      <div className="border border-slate-200/60 bg-white rounded-lg p-3 shadow-3xs relative overflow-hidden font-sans space-y-2">
                        <h5 className="font-bold text-[10px] text-slate-800 border-b border-slate-100 pb-1 flex items-center space-x-1">
                          <Shield className="h-3.5 w-3.5 text-indigo-500" />
                          <span>E-SIGN CERTIFIED DOC</span>
                        </h5>
                        <p className="text-[10px] text-slate-600 font-semibold">
                          Certified copy verifying the <strong className="text-slate-800">{activeDoc?.name}</strong>.
                        </p>
                        <div className="text-[8px] font-bold text-emerald-600 flex items-center space-x-1">
                          <CheckCircle className="h-3 w-3 shrink-0" />
                          <span>ELECTRONIC SIGNATURE VALID</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right side form */}
            <div className="space-y-6">
              {/* Field Inspection Form */}
              <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm space-y-4">
                <h4 className="text-xs font-bold text-slate-850 uppercase tracking-wider border-b border-slate-50 pb-1.5">Field Inspection details</h4>
                
                <div className="space-y-3.5 text-xs">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Inspection Date *</label>
                    <input
                      type="date"
                      value={inspectionDate}
                      onChange={(e) => setInspectionDate(e.target.value)}
                      className="h-9 w-full rounded-lg border border-slate-200 px-2.5 outline-none focus:border-indigo-500 bg-white font-semibold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Inspection Location *</label>
                    <input
                      type="text"
                      value={inspectionLocation}
                      onChange={(e) => setInspectionLocation(e.target.value)}
                      className="h-9 w-full rounded-lg border border-slate-200 px-2.5 outline-none focus:border-indigo-500 bg-white font-semibold"
                    />
                  </div>

                  <div className="grid gap-2 grid-cols-2">
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">GPS Latitude</label>
                      <input
                        type="text"
                        value={gpsLatitude}
                        onChange={(e) => setGpsLatitude(e.target.value)}
                        className="h-9 w-full rounded-lg border border-slate-200 px-2.5 outline-none focus:border-indigo-500 bg-white font-semibold font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">GPS Longitude</label>
                      <input
                        type="text"
                        value={gpsLongitude}
                        onChange={(e) => setGpsLongitude(e.target.value)}
                        className="h-9 w-full rounded-lg border border-slate-200 px-2.5 outline-none focus:border-indigo-500 bg-white font-semibold font-mono"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Photo Geotag URL</label>
                    <input
                      type="text"
                      value={photoUrl}
                      onChange={(e) => setPhotoUrl(e.target.value)}
                      className="h-9 w-full rounded-lg border border-slate-200 px-2.5 outline-none focus:border-indigo-500 bg-white font-semibold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Inspection Remarks *</label>
                    <textarea
                      rows={3}
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      placeholder="Enter mandatory inspection audit observations..."
                      className="w-full rounded-lg border border-slate-200 p-2.5 outline-none focus:border-indigo-500 font-semibold"
                    />
                  </div>

                  {remarks.trim() === '' && (
                    <p className="text-[9px] text-rose-500 font-bold">⚠️ Remarks are mandatory to complete any inspection action.</p>
                  )}

                  {/* Rejection specify reason */}
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Rejection Reason (If Rejecting)</label>
                    <input
                      type="text"
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Specify rejection details..."
                      className="h-9 w-full rounded-lg border border-slate-200 px-2.5 outline-none focus:border-indigo-500 bg-white font-semibold"
                    />
                  </div>

                  {/* Actions buttons grid */}
                  <div className="grid gap-2 grid-cols-2 pt-2">
                    <button
                      onClick={() => {
                        if (!remarks.trim()) { alert('Remarks are required.'); return; }
                        setShowApproveConfirm(true);
                      }}
                      disabled={submitting}
                      className="h-9 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-[11px] font-bold text-white shadow-xs flex items-center justify-center space-x-1 cursor-pointer transition-all"
                    >
                      <Check className="h-3.5 w-3.5" />
                      <span>Approve</span>
                    </button>
                    <button
                      onClick={() => {
                        if (!remarks.trim()) { alert('Remarks are required.'); return; }
                        setShowRejectConfirm(true);
                      }}
                      disabled={submitting}
                      className="h-9 rounded-lg bg-rose-600 hover:bg-rose-700 text-[11px] font-bold text-white shadow-xs flex items-center justify-center space-x-1 cursor-pointer transition-all"
                    >
                      <X className="h-3.5 w-3.5" />
                      <span>Reject</span>
                    </button>
                    <button
                      onClick={() => {
                        if (!remarks.trim()) { alert('Remarks are required.'); return; }
                        setShowDocsConfirm(true);
                      }}
                      disabled={submitting}
                      className="h-9 rounded-lg bg-indigo-650 hover:bg-indigo-700 text-[10px] font-bold text-white shadow-xs flex items-center justify-center space-x-0.5 cursor-pointer transition-all"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      <span>Request Docs</span>
                    </button>
                    <button
                      onClick={() => {
                        if (!remarks.trim()) { alert('Remarks are required.'); return; }
                        setShowRevisitConfirm(true);
                      }}
                      disabled={submitting}
                      className="h-9 rounded-lg bg-amber-500 hover:bg-amber-600 text-[10px] font-bold text-white shadow-xs flex items-center justify-center space-x-0.5 cursor-pointer transition-all"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      <span>Schedule Revisit</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation overlays */}
      {showApproveConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-100 p-6 max-w-sm w-full mx-4 shadow-xl space-y-4 text-xs font-semibold">
            <h4 className="text-base font-black text-slate-800">Confirm Approve Action</h4>
            <p className="text-slate-500 leading-relaxed">
              Are you sure you want to approve verification for application <strong>{selectedApp?.applicationNumber}</strong>? This advances the stage to <strong>DISTRICT_REVIEW</strong>.
            </p>
            <div className="flex justify-end space-x-2 pt-2">
              <button onClick={() => setShowApproveConfirm(false)} className="h-8 px-3 rounded-lg border border-slate-200 hover:bg-slate-50 text-[11px] font-bold text-slate-550 transition-all cursor-pointer">Cancel</button>
              <button onClick={() => submitAction('APPROVE')} disabled={submitting} className="h-8 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-[11px] font-bold text-white transition-all disabled:opacity-50 cursor-pointer">{submitting ? 'Submitting...' : 'Confirm'}</button>
            </div>
          </div>
        </div>
      )}

      {showRejectConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-100 p-6 max-w-sm w-full mx-4 shadow-xl space-y-4 text-xs font-semibold">
            <h4 className="text-base font-black text-slate-800">Confirm Reject Action</h4>
            <p className="text-slate-500 leading-relaxed">
              Are you sure you want to reject verification for application <strong>{selectedApp?.applicationNumber}</strong>? This is a terminal reject status.
            </p>
            <div className="flex justify-end space-x-2 pt-2">
              <button onClick={() => setShowRejectConfirm(false)} className="h-8 px-3 rounded-lg border border-slate-200 hover:bg-slate-50 text-[11px] font-bold text-slate-550 transition-all cursor-pointer">Cancel</button>
              <button onClick={() => submitAction('REJECT')} disabled={submitting} className="h-8 px-4 rounded-lg bg-rose-600 hover:bg-rose-700 text-[11px] font-bold text-white transition-all disabled:opacity-50 cursor-pointer">{submitting ? 'Submitting...' : 'Confirm'}</button>
            </div>
          </div>
        </div>
      )}

      {showDocsConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-100 p-6 max-w-sm w-full mx-4 shadow-xl space-y-4 text-xs font-semibold">
            <h4 className="text-base font-black text-slate-800">Confirm Request Additional Docs</h4>
            <p className="text-slate-500 leading-relaxed">
              Are you sure you want to request additional documents for application <strong>{selectedApp?.applicationNumber}</strong>? Status will be updated to <strong>CORRECTION_REQUIRED</strong>.
            </p>
            <div className="flex justify-end space-x-2 pt-2">
              <button onClick={() => setShowDocsConfirm(false)} className="h-8 px-3 rounded-lg border border-slate-200 hover:bg-slate-50 text-[11px] font-bold text-slate-550 transition-all cursor-pointer">Cancel</button>
              <button onClick={() => submitAction('REQUEST_ADDITIONAL_DOCS')} disabled={submitting} className="h-8 px-4 rounded-lg bg-indigo-650 hover:bg-indigo-700 text-[11px] font-bold text-white transition-all disabled:opacity-50 cursor-pointer">{submitting ? 'Submitting...' : 'Confirm'}</button>
            </div>
          </div>
        </div>
      )}

      {showRevisitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-100 p-6 max-w-sm w-full mx-4 shadow-xl space-y-4 text-xs font-semibold">
            <h4 className="text-base font-black text-slate-800">Confirm Schedule Revisit</h4>
            <p className="text-slate-500 leading-relaxed">
              Are you sure you want to schedule a revisit for application <strong>{selectedApp?.applicationNumber}</strong>? Status becomes <strong>RE_VERIFICATION_REQUESTED</strong>.
            </p>
            <div className="flex justify-end space-x-2 pt-2">
              <button onClick={() => setShowRevisitConfirm(false)} className="h-8 px-3 rounded-lg border border-slate-200 hover:bg-slate-50 text-[11px] font-bold text-slate-550 transition-all cursor-pointer">Cancel</button>
              <button onClick={() => submitAction('SCHEDULE_REVISIT')} disabled={submitting} className="h-8 px-4 rounded-lg bg-amber-500 hover:bg-amber-600 text-[11px] font-bold text-white transition-all disabled:opacity-50 cursor-pointer">{submitting ? 'Submitting...' : 'Confirm'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
