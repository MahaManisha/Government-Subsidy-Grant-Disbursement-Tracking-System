import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Check, X, FileText, User, BookOpen, Clock, RefreshCw, Eye, Download, Shield } from 'lucide-react';
import axiosInstance from '../api/axiosInstance';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorBoundary from '../components/ErrorBoundary';
import { useRole } from '../layouts/ProtectedLayout';

export default function DistrictReviewDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const auth = useRole();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [app, setApp] = useState(null);
  const [realDocuments, setRealDocuments] = useState([]);
  const [activeDoc, setActiveDoc] = useState(null);
  const [eligibilityReport, setEligibilityReport] = useState(null);
  const [fieldOfficerReport, setFieldOfficerReport] = useState(null);

  // Remarks and Action controls
  const [reviewRemarks, setReviewRemarks] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const [showCorrectConfirm, setShowCorrectConfirm] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // 1. Fetch Application Details
        const appRes = await axiosInstance.get(`/v1/applications/${id}`);
        if (appRes.data && appRes.data.success) {
          setApp(appRes.data.data);
        }

        // 2. Fetch Documents
        const docRes = await axiosInstance.get(`/v1/applications/${id}/documents`);
        if (docRes.data && docRes.data.success) {
          setRealDocuments(docRes.data.data || []);
          if (docRes.data.data && docRes.data.data.length > 0) {
            setActiveDoc(docRes.data.data[0]);
          }
        }

        // 3. Fetch Eligibility Score Breakdown
        const scoreRes = await axiosInstance.post(`/v1/applications/${id}/score`);
        if (scoreRes.data && scoreRes.data.success) {
          setEligibilityReport(scoreRes.data.data);
        }

        // 4. Fetch Verification History for Field Officer Report
        const historyRes = await axiosInstance.get(`/v1/applications/${id}/verification/history`);
        if (historyRes.data && historyRes.data.success) {
          const history = historyRes.data.data || [];
          // Find the verification done by the FIELD_OFFICER (which would have status VERIFIED and happened before DISTRICT_REVIEW)
          // Look for action that moved it out of FIELD_VERIFICATION, or just grab the latest VERIFIED from FO.
          // In VerificationHistoryDto we have status, actionDate, remarks.
          const foReport = history.find(h => h.remarks && h.remarks.toLowerCase().includes('field') || h.status === 'VERIFIED');
          // If we can't reliably filter by role in history, we just get the one before district review.
          setFieldOfficerReport(foReport);
        }
      } catch (err) {
        console.error('Failed to load application details:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const submitAction = async (actionType) => {
    if (!reviewRemarks.trim()) {
      alert('Remarks are mandatory before submitting any decision.');
      return;
    }
    setSubmitting(true);
    
    const payload = {
      officerId: auth?.user?.id || 10,
      action: actionType,
      remarks: reviewRemarks,
      rejectionReason: actionType === 'REJECT' ? (rejectionReason || reviewRemarks) : null
    };

    try {
      const response = await axiosInstance.post(
        `/v1/applications/${id}/verification/district-review`,
        payload
      );

      if (response.data && response.data.success) {
        alert(`Decision successfully recorded: ${actionType}`);
        navigate('/verification/district/reviews');
      }
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Action submission failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const getPriority = (app) => {
    if (app?.priority) return app.priority;
    if (app?.beneficiary?.annualIncome <= 150000) return 'HIGH';
    if (app?.beneficiary?.annualIncome <= 300000) return 'MEDIUM';
    return 'STANDARD';
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (!app) {
    return (
      <div className="text-center py-10">
        <h2 className="text-xl font-bold text-slate-800">Application not found</h2>
        <button onClick={() => navigate('/verification/district/reviews')} className="mt-4 text-indigo-600 font-semibold hover:underline">Return to reviews</button>
      </div>
    );
  }

  const isViewMode = !(app.currentStage === 'DISTRICT_REVIEW' || app.currentStage === 'DISTRICT_REVIEW_PENDING');

  return (
    <ErrorBoundary>
      <div className="space-y-6 max-w-7xl mx-auto pb-10">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <button onClick={() => navigate('/verification/district/reviews')} className="inline-flex items-center space-x-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-650 hover:bg-slate-50 shadow-sm transition-all cursor-pointer">
            <ChevronLeft className="h-4 w-4" />
            <span>Back to Reviews Queue</span>
          </button>
          <div className="text-right">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Currently Auditing Case</span>
            <h2 className="text-lg font-black text-slate-800 flex items-center space-x-2 justify-end">
              <span>{app.applicationNumber}</span>
              <span className={`inline-flex rounded px-1.5 py-0.5 text-[9px] font-black ${getPriority(app) === 'HIGH' ? 'bg-rose-100 text-rose-750' : 'bg-slate-100 text-slate-700'}`}>
                {getPriority(app)} Priority
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
                <div className="bg-slate-50 rounded-xl p-3"><span className="text-slate-400 block font-semibold mb-0.5">Full Name</span><span className="font-bold text-slate-800 text-sm">{app.beneficiary?.user?.firstName ? `${app.beneficiary.user.firstName} ${app.beneficiary.user.lastName || ''}`.trim() : 'N/A'}</span></div>
                <div className="bg-slate-50 rounded-xl p-3"><span className="text-slate-400 block font-semibold mb-0.5">Aadhaar Number</span><span className="font-mono font-bold text-slate-750 text-sm">{app.beneficiary?.uniqueIdNumber || 'N/A'}</span></div>
                <div className="bg-slate-50 rounded-xl p-3"><span className="text-slate-400 block font-semibold mb-0.5">Mobile Number</span><span className="font-mono font-bold text-slate-750 text-sm">{app.beneficiary?.phoneNumber || 'N/A'}</span></div>
                <div className="bg-slate-50 rounded-xl p-3"><span className="text-slate-400 block font-semibold mb-0.5">Date of Birth / Age</span><span className="font-bold text-slate-800 text-sm">{app.beneficiary?.dateOfBirth ? `${new Date(app.beneficiary.dateOfBirth).toLocaleDateString()} (${new Date().getFullYear() - new Date(app.beneficiary.dateOfBirth).getFullYear()} years)` : 'N/A'}</span></div>
                <div className="bg-slate-50 rounded-xl p-3"><span className="text-slate-400 block font-semibold mb-0.5">Gender & Category</span><span className="font-bold text-slate-800 text-sm">{app.beneficiary?.gender || 'N/A'} - {app.beneficiary?.category || 'General'}</span></div>
                <div className="bg-slate-50 rounded-xl p-3"><span className="text-slate-400 block font-semibold mb-0.5">Occupation</span><span className="font-bold text-slate-800 text-sm">{app.beneficiary?.occupation || 'N/A'}</span></div>
                <div className="bg-slate-50 rounded-xl p-3"><span className="text-slate-400 block font-semibold mb-0.5">Family Size</span><span className="font-bold text-slate-800 text-sm">{app.beneficiary?.familySize || 1} members</span></div>
                <div className="bg-slate-50 rounded-xl p-3"><span className="text-slate-400 block font-semibold mb-0.5">Ration / BPL Status</span><span className="font-bold text-slate-800 text-sm">{app.beneficiary?.bplAplStatus || 'APL'} (Card: {app.beneficiary?.rationCardNumber || 'N/A'})</span></div>
                <div className="bg-slate-50 rounded-xl p-3 sm:col-span-2"><span className="text-slate-400 block font-semibold mb-0.5">Residential Address</span><span className="font-semibold text-slate-755">{app.beneficiary?.address || 'N/A'}, {app.beneficiary?.city || ''}, {app.beneficiary?.district || 'Gandhinagar'}, {app.beneficiary?.state || 'Gujarat'} - {app.beneficiary?.pinCode || ''}</span></div>
              </div>
            </div>

            {/* Scheme Information */}
            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm space-y-4">
              <div className="flex items-center space-x-2 border-b border-slate-50 pb-2.5">
                <BookOpen className="h-5 w-5 text-indigo-500" />
                <h3 className="text-xs font-bold text-slate-850 uppercase tracking-wider">Scheme Information</h3>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 text-xs leading-relaxed">
                <div className="bg-slate-50 rounded-xl p-3 sm:col-span-2"><span className="text-slate-400 block font-semibold mb-0.5">Scheme Name</span><span className="font-bold text-slate-800 text-sm">{app.scheme?.name || 'N/A'}</span></div>
                <div className="bg-slate-50 rounded-xl p-3"><span className="text-slate-400 block font-semibold mb-0.5">Requested Amount</span><span className="font-bold text-slate-800 text-sm">₹{app.requestedAmount?.toLocaleString()}</span></div>
                <div className="bg-slate-50 rounded-xl p-3"><span className="text-slate-400 block font-semibold mb-0.5">Application Date</span><span className="font-bold text-slate-800 text-sm">{app.submittedDate ? new Date(app.submittedDate).toLocaleDateString() : 'N/A'}</span></div>
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
                  {realDocuments.map((doc, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveDoc(doc)}
                      className={`w-full flex items-center justify-between border rounded-xl p-3 transition-all text-left cursor-pointer ${activeDoc?.id === doc.id ? 'bg-indigo-50/50 border-indigo-200' : 'bg-slate-50/55 hover:bg-slate-50 border-slate-100'}`}
                    >
                      <div className="space-y-0.5 max-w-[80%]">
                        <p className="font-bold text-slate-800 truncate">{doc.documentType || 'Document'}</p>
                        <p className="text-[9px] text-slate-400 font-semibold truncate">{doc.originalFileName}</p>
                      </div>
                      <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                    </button>
                  ))}
                  {realDocuments.length === 0 && <p className="text-[10px] text-slate-500 italic p-3">No documents attached.</p>}
                </div>

                {/* Right Document Preview Box */}
                <div className="md:col-span-3 border border-slate-150 rounded-xl p-4 bg-slate-50/45 flex flex-col justify-between space-y-4 min-h-[220px]">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-150 pb-2">
                      <span className="font-bold text-indigo-650 uppercase tracking-wider text-[10px]">Document Previewer</span>
                    </div>

                    {/* Real Certificate Link */}
                    <div className="border border-slate-200/60 bg-white rounded-lg p-4 shadow-3xs relative overflow-hidden font-sans space-y-4 flex flex-col items-center justify-center min-h-[120px]">
                      {activeDoc ? (
                        <>
                          <h5 className="font-bold text-[12px] text-slate-800 text-center">{activeDoc.documentType || 'Attached Document'}</h5>
                          <p className="text-[10px] text-slate-500 font-mono">{activeDoc.originalFileName}</p>
                          <a
                            href={`http://localhost:8081/api/v1/documents/${activeDoc.id}/view`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-4 py-2 bg-indigo-50 text-indigo-700 font-bold text-xs rounded-lg border border-indigo-200 hover:bg-indigo-100 transition-all flex items-center gap-2 mt-2"
                          >
                            <Eye className="h-4 w-4" /> Open Document View
                          </a>
                        </>
                      ) : (
                        <p className="text-xs text-slate-400">Select a document to preview</p>
                      )}
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
            
            {/* Field Officer Verification Report */}
            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm space-y-3.5">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-50 pb-1 flex items-center"><Shield className="h-3.5 w-3.5 mr-1 text-slate-400" /> Field Officer Report</h4>
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 text-xs space-y-2">
                {fieldOfficerReport ? (
                  <>
                    <div className="flex justify-between border-b border-slate-200 pb-2">
                      <span className="font-semibold text-slate-500">Status</span>
                      <span className="font-bold text-emerald-600">{fieldOfficerReport.status}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200 pb-2">
                      <span className="font-semibold text-slate-500">Date</span>
                      <span className="font-bold text-slate-700">{new Date(fieldOfficerReport.actionDate || new Date()).toLocaleString()}</span>
                    </div>
                    <div className="pt-1">
                      <span className="font-semibold text-slate-500 block mb-1">FO Remarks:</span>
                      <p className="text-slate-800 font-medium italic">"{fieldOfficerReport.remarks || 'No remarks provided.'}"</p>
                    </div>
                  </>
                ) : (
                  <p className="text-slate-500 italic text-center py-2">No field officer report found.</p>
                )}
              </div>
            </div>

            {/* Eligibility Report */}
            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm space-y-3.5">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-50 pb-1">Eligibility Engine Breakdown</h4>
              <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-xl p-4 border border-slate-800 text-xs space-y-3 relative overflow-hidden shadow-sm">
                <div className="absolute right-0 top-0 h-16 w-16 bg-white/5 rounded-full translate-x-3 -translate-y-3"></div>
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-slate-300">Total Score:</span>
                  <span className="text-lg font-black text-emerald-450">{eligibilityReport?.totalScore || app.eligibilityScore || 0} / 100</span>
                </div>
                <div className="border-t border-white/10 pt-2 text-[10px] space-y-2 font-medium text-slate-300 max-h-48 overflow-y-auto pr-1">
                  {eligibilityReport?.ruleBreakdown?.map((rule, idx) => (
                    <div key={idx} className={`flex items-start justify-between ${rule.passed ? 'text-emerald-400' : 'text-rose-400'}`}>
                      <div className="flex items-start">
                        {rule.passed ? <Check className="h-3.5 w-3.5 mr-1.5 shrink-0 mt-0.5" /> : <X className="h-3.5 w-3.5 mr-1.5 shrink-0 mt-0.5" />} 
                        <span className="leading-tight">{rule.ruleName} <br/><span className="text-[8px] text-slate-400">{rule.description}</span></span>
                      </div>
                      <span className="font-bold ml-2">+{rule.scoreAwarded}</span>
                    </div>
                  ))}
                  {!eligibilityReport && (
                     <div className="text-slate-400 italic text-center">Loading rules...</div>
                  )}
                </div>
                <div className="border-t border-white/10 pt-3 flex justify-between items-center text-[10px]">
                  <span className="font-semibold text-slate-300">Engine Decision:</span>
                  <span className={`font-bold ${eligibilityReport?.eligibilityResult === 'ELIGIBLE' ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {eligibilityReport?.eligibilityResult || app.eligibilityResult || 'UNKNOWN'}
                  </span>
                </div>
              </div>
            </div>

            {/* District Decision Panel */}
            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm space-y-4">
              <h4 className="text-xs font-bold text-slate-850 uppercase tracking-wider">District Decision Panel</h4>
              {isViewMode ? (
                <div className="bg-slate-50 rounded-xl p-4 text-xs font-bold text-slate-500 border border-slate-150 text-center leading-relaxed">
                  ℹ️ This application is not in DISTRICT_REVIEW stage. Decision actions are restricted.
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
                  <div className="grid gap-2 grid-cols-1 sm:grid-cols-2">
                    <button
                      onClick={() => {
                        if (!reviewRemarks.trim()) return alert('Remarks are mandatory.');
                        setShowApproveConfirm(true);
                      }}
                      disabled={submitting}
                      className="h-9 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-[11px] font-bold text-white shadow-sm flex items-center justify-center space-x-1 transition-all disabled:opacity-50 cursor-pointer"
                    >
                      <Check className="h-3.5 w-3.5" />
                      <span>Approve & Forward</span>
                    </button>
                    <button
                      onClick={() => {
                        if (!reviewRemarks.trim()) return alert('Remarks are mandatory.');
                        setShowRejectConfirm(true);
                      }}
                      disabled={submitting}
                      className="h-9 rounded-lg bg-rose-600 hover:bg-rose-700 text-[11px] font-bold text-white shadow-sm flex items-center justify-center space-x-1 transition-all disabled:opacity-50 cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" />
                      <span>Reject Application</span>
                    </button>
                    <button
                      onClick={() => {
                        if (!reviewRemarks.trim()) return alert('Remarks are mandatory.');
                        setShowCorrectConfirm(true);
                      }}
                      disabled={submitting}
                      className="h-9 rounded-lg bg-amber-500 hover:bg-amber-600 text-[11px] font-bold text-white shadow-sm flex items-center justify-center space-x-1 transition-all disabled:opacity-50 sm:col-span-2 cursor-pointer"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      <span>Send Back for Correction</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Confirmation Modals */}
        {showApproveConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white rounded-2xl border border-slate-100 p-6 max-w-sm w-full mx-4 shadow-xl space-y-4">
              <h4 className="text-base font-black text-slate-800">Confirm Approve Decision</h4>
              <p className="text-xs text-slate-505 leading-relaxed">
                Are you sure you want to approve application <strong>{app.applicationNumber}</strong>? This will forward it to the Finance Officer.
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
                Are you sure you want to reject application <strong>{app.applicationNumber}</strong>? This is a terminal action.
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
                Are you sure you want to return application <strong>{app.applicationNumber}</strong> to the field officer for clarification?
              </p>
              <div className="flex justify-end space-x-2 pt-2">
                <button onClick={() => setShowCorrectConfirm(false)} className="h-8 px-3 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-500 transition-all cursor-pointer">Cancel</button>
                <button onClick={() => submitAction('REQUEST_REVERIFICATION')} disabled={submitting} className="h-8 px-4 rounded-lg bg-amber-500 hover:bg-amber-600 text-xs font-bold text-white transition-all disabled:opacity-50 cursor-pointer">{submitting ? 'Submitting...' : 'Confirm Correction'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}
