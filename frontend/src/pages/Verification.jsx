import React, { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import {
  FileCheck, ShieldAlert, Award, Clock, User,
  Check, X, RefreshCw, MessageSquare, FileX, AlertCircle
} from 'lucide-react';
import axiosInstance from '../api/axiosInstance';
import LoadingSpinner from '../components/LoadingSpinner';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useRole } from '../layouts/ProtectedLayout';
import { Navigate } from 'react-router-dom';

export default function Verification({ filterDistrict, filterFinance }) {
  const auth = useRole();
  const activeRole = auth ? auth.activeRole : 'ROLE_ADMIN';
  const currentUser = auth ? auth.user : null;

  // District Officer uses its own dedicated page
  if (activeRole === 'ROLE_DISTRICT_OFFICER') {
    return <Navigate to="/verification/district/reviews" replace />;
  }

  // -----------------------------------------------------------------------
  // State
  // -----------------------------------------------------------------------
  const [applications, setApplications] = useState([]);
  const [selectedAppId, setSelectedAppId] = useState('');
  const [verification, setVerification] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [officers, setOfficers] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // -----------------------------------------------------------------------
  // Fetch all applications from the real backend API
  // -----------------------------------------------------------------------
  const fetchApplications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axiosInstance.get('/v1/applications');
      if (response.data && response.data.success) {
        let list = response.data.data || [];

        // Apply role-based filters on real API data — no localStorage
        if (filterDistrict) {
          list = list.filter(a => a.currentStage === 'DISTRICT_REVIEW' || a.currentStage === 'DISTRICT_REVIEW_PENDING');
        } else if (filterFinance) {
          list = list.filter(a => a.currentStage === 'FINANCE_REVIEW' || a.currentStage === 'FINANCE_REVIEW_PENDING');
        } else if (activeRole === 'ROLE_FIELD_OFFICER') {
          // Only show applications assigned to this specific officer
          list = list.filter(a => {
            const officerUsername = a.assignedOfficer?.username;
            return officerUsername && currentUser?.username && officerUsername === currentUser.username;
          });
        }
        setApplications(list);
      } else {
        setApplications([]);
      }
    } catch (err) {
      console.error('Failed to load applications:', err);
      const msg = err.response?.data?.message || err.message || 'Failed to load applications.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [activeRole, filterDistrict, filterFinance, currentUser?.username]);

  // Fetch users list (officers) for assignment dropdown
  const fetchOfficers = useCallback(async () => {
    if (activeRole !== 'ROLE_ADMIN') return;
    try {
      const response = await axiosInstance.get('/v1/users');
      if (response.data && response.data.success) {
        setOfficers(response.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load officers:', err);
    }
  }, [activeRole]);

  useEffect(() => {
    fetchApplications();
    fetchOfficers();
  }, [fetchApplications, fetchOfficers]);

  // -----------------------------------------------------------------------
  // Fetch Verification record and history from API when selection changes
  // -----------------------------------------------------------------------
  const fetchVerificationState = useCallback(async (appId) => {
    if (!appId) {
      setVerification(null);
      setHistory([]);
      return;
    }
    setHistoryLoading(true);
    try {
      // 1. Get current verification state
      const stateRes = await axiosInstance.get(`/v1/applications/${appId}/verification`);
      if (stateRes.data && stateRes.data.success) {
        setVerification(stateRes.data.data);
      } else {
        setVerification(null);
      }

      // 2. Get full verification audit history
      const histRes = await axiosInstance.get(`/v1/applications/${appId}/verification/history`);
      if (histRes.data && histRes.data.success) {
        setHistory(histRes.data.data || []);
      } else {
        setHistory([]);
      }
    } catch (err) {
      // 404 is normal for applications that haven't started verification yet
      setVerification(null);
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVerificationState(selectedAppId);
  }, [selectedAppId, fetchVerificationState]);

  // -----------------------------------------------------------------------
  // Forms
  // -----------------------------------------------------------------------
  const { register: registerAssign, handleSubmit: handleSubmitAssign, reset: resetAssign } = useForm();
  const { register: registerAction, handleSubmit: handleSubmitAction, reset: resetAction } = useForm();

  // -----------------------------------------------------------------------
  // Step 1: Assign Field Officer (Admin action)
  // -----------------------------------------------------------------------
  const onAssignOfficer = async (data) => {
    setSubmitting(true);
    const payload = {
      fieldOfficerId: Number(data.fieldOfficerId),
      remarks: data.remarks
    };
    try {
      const response = await axiosInstance.post(
        `/v1/applications/${selectedAppId}/verification/assign-officer`,
        payload
      );
      if (response.data && response.data.success) {
        toast.success('Field officer assigned successfully! Application stage updated to FIELD_VERIFICATION.');
        resetAssign();
        // Re-fetch fresh data from the API — no localStorage
        await fetchApplications();
        await fetchVerificationState(selectedAppId);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Assignment failed.');
    } finally {
      setSubmitting(false);
    }
  };

  // -----------------------------------------------------------------------
  // Steps 2-4: Apply Review Action (Approve / Reject / Re-verification)
  // -----------------------------------------------------------------------
  const onApplyAction = async (data) => {
    if (!data.action) {
      toast.error('Please select a review action.');
      return;
    }

    setSubmitting(true);
    const payload = {
      officerId: Number(data.officerId),
      action: data.action === 'FORWARD' ? 'APPROVE' : data.action,
      remarks: data.remarks,
      rejectionReason: data.action === 'REJECT' ? data.rejectionReason : null
    };

    // Determine the correct API endpoint for the current workflow stage
    const currentStage = currentSelectedApp?.currentStage;
    let endpoint = '';
    if (currentStage === 'FIELD_VERIFICATION' || currentStage === 'FIELD_VERIFICATION_PENDING') {
      endpoint = 'field-verify';
    } else if (currentStage === 'DISTRICT_REVIEW' || currentStage === 'DISTRICT_REVIEW_PENDING') {
      endpoint = 'district-review';
    } else if (currentStage === 'FINANCE_REVIEW' || currentStage === 'FINANCE_REVIEW_PENDING') {
      endpoint = 'finance-review';
    }

    if (!endpoint) {
      toast.error('Invalid workflow stage for action submission.');
      setSubmitting(false);
      return;
    }

    try {
      const response = await axiosInstance.post(
        `/v1/applications/${selectedAppId}/verification/${endpoint}`,
        payload
      );
      if (response.data && response.data.success) {
        toast.success(`Action "${data.action}" submitted successfully!`);
        resetAction();
        // Re-fetch fresh data from the API — no localStorage
        await fetchApplications();
        await fetchVerificationState(selectedAppId);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Action processing failed.');
    } finally {
      setSubmitting(false);
    }
  };

  // -----------------------------------------------------------------------
  // Derived state — computed from real API data only
  // -----------------------------------------------------------------------
  const currentSelectedApp = applications.find(a => a.id === Number(selectedAppId));

  // Stats — calculated from the actual API-sourced applications list
  const counts = {
    pending: applications.filter(a =>
      a.currentStage === 'FIELD_VERIFICATION' ||
      a.currentStage === 'DISTRICT_REVIEW' ||
      a.currentStage === 'FINANCE_REVIEW' ||
      a.workflowStatus === 'SUBMITTED' ||
      a.workflowStatus === 'UNDER_REVIEW'
    ).length,
    approved: applications.filter(a =>
      a.workflowStatus === 'APPROVED' ||
      a.workflowStatus === 'DISBURSED' ||
      a.workflowStatus === 'FIELD_VERIFIED'
    ).length,
    rejected: applications.filter(a =>
      a.workflowStatus === 'REJECTED' ||
      a.workflowStatus === 'DISTRICT_REJECTED'
    ).length
  };

  // Label for the page header based on role/filter
  const pageTitle = filterDistrict
    ? 'District Review Workflow'
    : filterFinance
      ? 'Finance Review Workflow'
      : activeRole === 'ROLE_FIELD_OFFICER'
        ? 'Field Verification Workflow'
        : 'Verification Officer Dashboard';

  const pageDesc = filterDistrict
    ? 'Review and process applications at the district level.'
    : filterFinance
      ? 'Approve or reject applications at the finance review stage.'
      : activeRole === 'ROLE_FIELD_OFFICER'
        ? 'Review your assigned applications and submit on-site verification decisions.'
        : 'Review application verification pipelines, assign officers, and apply decisions.';

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------
  return (
    <div className="space-y-6">
      <ToastContainer position="top-right" autoClose={3000} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-800">{pageTitle}</h1>
          <p className="text-slate-500 mt-1 text-sm">{pageDesc}</p>
        </div>
        <button
          onClick={() => { fetchApplications(); if (selectedAppId) fetchVerificationState(selectedAppId); }}
          className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all shadow-sm cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Stats Row — numbers computed from real API data */}
      <div className="grid gap-6 sm:grid-cols-3">
        {/* Pending */}
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Pending Actions Queue</p>
            {loading ? (
              <div className="h-9 w-10 bg-slate-100 animate-pulse rounded-lg mt-2" />
            ) : (
              <h3 className="text-3xl font-black text-amber-500 mt-2">{counts.pending}</h3>
            )}
            {!loading && counts.pending === 0 && (
              <p className="text-[10px] text-slate-400 font-semibold mt-1">No pending verification tasks.</p>
            )}
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-500">
            <Clock className="h-6 w-6" />
          </div>
        </div>

        {/* Approved */}
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Approved Files</p>
            {loading ? (
              <div className="h-9 w-10 bg-slate-100 animate-pulse rounded-lg mt-2" />
            ) : (
              <h3 className="text-3xl font-black text-emerald-500 mt-2">{counts.approved}</h3>
            )}
            {!loading && counts.approved === 0 && (
              <p className="text-[10px] text-slate-400 font-semibold mt-1">No approved verifications yet.</p>
            )}
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-500">
            <FileCheck className="h-6 w-6" />
          </div>
        </div>

        {/* Rejected */}
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Rejected Files</p>
            {loading ? (
              <div className="h-9 w-10 bg-slate-100 animate-pulse rounded-lg mt-2" />
            ) : (
              <h3 className="text-3xl font-black text-rose-500 mt-2">{counts.rejected}</h3>
            )}
            {!loading && counts.rejected === 0 && (
              <p className="text-[10px] text-slate-400 font-semibold mt-1">No rejected verifications.</p>
            )}
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-50 text-rose-500">
            <ShieldAlert className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Error state */}
      {error && !loading && (
        <div className="flex items-center gap-3 rounded-xl border border-rose-100 bg-rose-50 p-4 text-sm font-semibold text-rose-700">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
          <button
            onClick={fetchApplications}
            className="ml-auto flex items-center gap-1.5 rounded-lg bg-rose-100 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-200 transition-all cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Retry
          </button>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid gap-6 lg:grid-cols-3">

        {/* Left Column: Application Selector + Action Forms */}
        <div className="lg:col-span-2 space-y-6">

          {/* Application Dropdown */}
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm space-y-3">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
              Select Application File to Review
            </label>

            {loading ? (
              <div className="h-10 w-full bg-slate-100 animate-pulse rounded-lg" />
            ) : applications.length === 0 ? (
              /* Professional empty state when no applications exist at all */
              <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 py-10 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                  <FileX className="h-6 w-6 text-slate-300" />
                </div>
                <div>
                  <p className="text-sm font-black text-slate-700">No Applications Awaiting Verification</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs">
                    {activeRole === 'ROLE_FIELD_OFFICER'
                      ? 'You currently have no applications assigned for field verification. New assignments will appear here automatically.'
                      : filterDistrict
                        ? 'No applications are currently at the District Review stage.'
                        : filterFinance
                          ? 'No applications are currently at the Finance Review stage.'
                          : 'No applications are currently awaiting verification.'}
                  </p>
                </div>
                <button
                  onClick={fetchApplications}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all cursor-pointer shadow-sm"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Refresh
                </button>
              </div>
            ) : (
              <select
                value={selectedAppId}
                onChange={(e) => setSelectedAppId(e.target.value)}
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none cursor-pointer focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                <option value="">-- Choose Application File --</option>
                {applications.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.applicationNumber}
                    {a.beneficiary
                      ? ` — ${a.beneficiary.name || `${a.beneficiary.firstName || ''} ${a.beneficiary.lastName || ''}`.trim() || 'Unlinked'}`
                      : ''}
                    {a.currentStage ? ` (Stage: ${a.currentStage.replace(/_/g, ' ')})` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Application Details + Action Forms (only when an app is selected) */}
          {currentSelectedApp && (
            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-slate-50 pb-3">
                <h3 className="text-lg font-bold text-slate-800">
                  Reviewing File: {currentSelectedApp.applicationNumber}
                </h3>
                {currentSelectedApp.priority && (
                  <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                    Priority: {currentSelectedApp.priority}
                  </span>
                )}
              </div>

              {/* Application Summary */}
              <div className="grid gap-4 sm:grid-cols-2 text-sm bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div>
                  <p className="text-slate-400 text-xs font-semibold">Beneficiary</p>
                  <p className="font-semibold text-slate-800 mt-0.5">
                    {currentSelectedApp.beneficiary?.name ||
                      (currentSelectedApp.beneficiary?.user?.firstName
                        ? `${currentSelectedApp.beneficiary.user.firstName} ${currentSelectedApp.beneficiary.user.lastName || ''}`.trim()
                        : `${currentSelectedApp.beneficiary?.firstName || ''} ${currentSelectedApp.beneficiary?.lastName || ''}`.trim()) ||
                      'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 text-xs font-semibold">Requested Amount</p>
                  <p className="font-semibold text-slate-800 mt-0.5">
                    {currentSelectedApp.requestedAmount != null
                      ? `₹${Number(currentSelectedApp.requestedAmount).toLocaleString()}`
                      : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 text-xs font-semibold">Current Stage</p>
                  <p className="font-semibold text-slate-800 mt-0.5 uppercase">
                    {currentSelectedApp.currentStage?.replace(/_/g, ' ') || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 text-xs font-semibold">Eligibility Score</p>
                  <p className="font-semibold text-slate-800 mt-0.5">
                    {currentSelectedApp.eligibilityScore != null
                      ? `${currentSelectedApp.eligibilityScore} / 100`
                      : 'Not yet evaluated'}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 text-xs font-semibold">Workflow Status</p>
                  <p className="font-semibold text-slate-800 mt-0.5">
                    {currentSelectedApp.workflowStatus?.replace(/_/g, ' ') || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 text-xs font-semibold">Submitted Date</p>
                  <p className="font-semibold text-slate-800 mt-0.5">
                    {currentSelectedApp.submittedDate
                      ? new Date(currentSelectedApp.submittedDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                      : 'N/A'}
                  </p>
                </div>
              </div>

              {/* Action Forms */}
              <div className="border-t border-slate-100 pt-6">

                {/* INITIATION stage: Assign Field Officer */}
                {currentSelectedApp.currentStage === 'INITIATION' && (
                  <form onSubmit={handleSubmitAssign(onAssignOfficer)} className="space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Step 1: Assign Field Officer to File
                    </h4>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                        Select Field Officer
                      </label>
                      <select
                        {...registerAssign('fieldOfficerId', { required: true })}
                        className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none cursor-pointer focus:border-blue-500"
                      >
                        <option value="">-- Select Officer --</option>
                        {officers
                          .filter(o => o.roles?.some(r => r === 'ROLE_FIELD_OFFICER' || r.name === 'ROLE_FIELD_OFFICER'))
                          .map(o => (
                            <option key={o.id} value={o.id}>
                              {o.firstName} {o.lastName} ({o.username})
                            </option>
                          ))}
                        {/* Fallback: show all users if role filtering yields none */}
                        {officers.filter(o => o.roles?.some(r => r === 'ROLE_FIELD_OFFICER' || r.name === 'ROLE_FIELD_OFFICER')).length === 0 &&
                          officers.map(o => (
                            <option key={o.id} value={o.id}>
                              {o.firstName} {o.lastName} ({o.username})
                            </option>
                          ))
                        }
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                        Assignment Remarks (Optional)
                      </label>
                      <textarea
                        rows={2}
                        placeholder="Notes about this assignment..."
                        {...registerAssign('remarks')}
                        className="w-full rounded-lg border border-slate-200 p-3 text-sm outline-none focus:border-blue-500"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="h-9 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-xs font-semibold text-white transition-all shadow-sm disabled:opacity-50 cursor-pointer"
                    >
                      {submitting ? 'Assigning...' : 'Assign Officer'}
                    </button>
                  </form>
                )}

                {/* Active review stages: Approve / Reject / Re-verification */}
                {['FIELD_VERIFICATION', 'DISTRICT_REVIEW', 'FINANCE_REVIEW'].includes(currentSelectedApp.currentStage) && (
                  <form onSubmit={handleSubmitAction(onApplyAction)} className="space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Apply Review Decision
                    </h4>
                    <div className="grid gap-4 sm:grid-cols-2">
                      {/* Acting Officer */}
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                          Acting Officer
                        </label>
                        <select
                          {...registerAction('officerId', { required: true })}
                          className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none cursor-pointer focus:border-blue-500"
                        >
                          <option value="">-- Select Officer --</option>
                          {officers.map(o => (
                            <option key={o.id} value={o.id}>
                              {o.firstName} {o.lastName} ({o.username})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Review Action */}
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                          Review Action
                        </label>
                        <select
                          {...registerAction('action', { required: true })}
                          className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none cursor-pointer focus:border-blue-500"
                        >
                          <option value="">-- Select Action --</option>
                          {currentSelectedApp.currentStage === 'DISTRICT_REVIEW' ? (
                            <>
                              <option value="APPROVE">APPROVE → District Approved</option>
                              <option value="FORWARD">FORWARD TO FINANCE</option>
                              <option value="REQUEST_REVERIFICATION">REQUEST RE-VERIFICATION</option>
                              <option value="REJECT">REJECT → District Rejected</option>
                            </>
                          ) : (
                            <>
                              <option value="APPROVE">APPROVE → Advance to Next Stage</option>
                              <option value="REQUEST_REVERIFICATION">REQUEST RE-VERIFICATION</option>
                              <option value="REJECT">REJECT → Terminate File</option>
                            </>
                          )}
                        </select>
                      </div>
                    </div>

                    {/* Remarks */}
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                        Officer Remarks
                      </label>
                      <textarea
                        rows={2}
                        placeholder="Provide details explaining the audit outcome..."
                        {...registerAction('remarks')}
                        className="w-full rounded-lg border border-slate-200 p-3 text-sm outline-none focus:border-blue-500"
                      />
                    </div>

                    {/* Rejection Reason */}
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                        Rejection Reason (Required when rejecting)
                      </label>
                      <input
                        type="text"
                        placeholder="Reason for file rejection..."
                        {...registerAction('rejectionReason')}
                        className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-blue-500"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="h-9 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-xs font-semibold text-white transition-all shadow-sm disabled:opacity-50 cursor-pointer"
                    >
                      {submitting ? 'Submitting...' : 'Submit Audit Decision'}
                    </button>
                  </form>
                )}

                {/* Terminal states: COMPLETED or REJECTED */}
                {['COMPLETED', 'REJECTED', 'DISBURSED'].includes(currentSelectedApp.currentStage) && (
                  <div className="flex items-center space-x-2 text-xs font-semibold text-slate-500 bg-slate-50 border border-slate-100 p-4 rounded-xl">
                    <User className="h-4 w-4 shrink-0" />
                    <span>
                      This application is in a terminal state ({currentSelectedApp.workflowStatus?.replace(/_/g, ' ')}). No further actions are required.
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Empty state when no app is selected and list is loaded */}
          {!currentSelectedApp && !loading && applications.length > 0 && (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center">
              <p className="text-sm font-bold text-slate-500">Select an application above to begin reviewing.</p>
            </div>
          )}
        </div>

        {/* Right Column: Audit History Timeline */}
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm space-y-6">
          <h3 className="text-lg font-bold text-slate-800 border-b border-slate-50 pb-2 flex items-center space-x-2">
            <Clock className="h-5 w-5 text-blue-600" />
            <span>Audit History Timeline</span>
          </h3>

          {historyLoading ? (
            <div className="py-12 flex justify-center">
              <LoadingSpinner size="small" />
            </div>
          ) : !selectedAppId ? (
            /* No application selected */
            <div className="flex flex-col items-center gap-3 text-center py-12">
              <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center">
                <Clock className="h-5 w-5 text-slate-300" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-600">No Audit History Available</p>
                <p className="text-xs text-slate-400 mt-1">Select an application file to retrieve its verification history.</p>
              </div>
            </div>
          ) : history.length === 0 ? (
            /* Application selected but no history records exist yet */
            <div className="flex flex-col items-center gap-3 text-center py-12">
              <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center">
                <FileX className="h-5 w-5 text-slate-300" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-600">No Verification History Found</p>
                <p className="text-xs text-slate-400 mt-1">
                  No audit records have been logged for this application yet.
                </p>
              </div>
            </div>
          ) : (
            /* Real history records from the API */
            <div className="relative border-l border-slate-100 pl-4 space-y-6 ml-2">
              {history.map((step, i) => (
                <div key={step.id || i} className="relative text-xs">
                  {/* Timeline bullet */}
                  <span className="absolute -left-6 top-1.5 h-3 w-3 rounded-full bg-blue-600 border-2 border-white shadow-sm" />

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 uppercase">
                        {/* API uses step.status (VerificationHistoryDto.status) */}
                        {step.status?.replace(/_/g, ' ') || '—'}
                      </span>
                      <span className="text-[10px] text-slate-400 font-semibold">
                        {/* API uses step.actionDate (VerificationHistoryDto.actionDate) */}
                        {step.actionDate
                          ? new Date(step.actionDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                          : 'N/A'}
                      </span>
                    </div>

                    {step.officer && (
                      <p className="text-[10px] text-slate-400 font-semibold flex items-center space-x-1">
                        <User className="h-3 w-3 inline mr-0.5" />
                        <span>
                          {step.officer.firstName} {step.officer.lastName}
                          {step.officer.username ? ` (@${step.officer.username})` : ''}
                        </span>
                      </p>
                    )}

                    {step.remarks && (
                      <p className="text-slate-600 bg-slate-50 p-2 rounded border border-slate-100 mt-1 leading-relaxed italic flex items-start space-x-1">
                        <MessageSquare className="h-3.5 w-3.5 text-slate-400 flex-shrink-0 mt-0.5 mr-0.5" />
                        <span>{step.remarks}</span>
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
