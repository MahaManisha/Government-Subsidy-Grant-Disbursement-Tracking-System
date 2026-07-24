import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { ShieldCheck, ShieldAlert, Clock, AlertTriangle, FileText, Calendar, Plus, Check, X, Send } from 'lucide-react';
import axiosInstance from '../api/axiosInstance';
import LoadingSpinner from '../components/LoadingSpinner';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function Compliance() {
  const [applications, setApplications] = useState([]);
  const [selectedAppId, setSelectedAppId] = useState('');
  const [compliances, setCompliances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [listLoading, setListLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showSubmitForm, setShowSubmitForm] = useState(false);
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  // Load applications list
  const loadApplications = () => {
    const stored = localStorage.getItem('applications_ledger');
    if (stored) {
      setApplications(JSON.parse(stored));
    }
  };

  useEffect(() => {
    loadApplications();
    setLoading(false);
  }, []);

  // Fetch compliance list for selected application
  const fetchCompliances = async (appId) => {
    if (!appId) {
      setCompliances([]);
      return;
    }
    setListLoading(true);
    try {
      const response = await axiosInstance.get(`/v1/compliances/application/${appId}`);
      if (response.data && response.data.success) {
        setCompliances(response.data.data || []);
      } else {
        setCompliances([]);
      }
    } catch (err) {
      setCompliances([]);
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => {
    fetchCompliances(selectedAppId);
  }, [selectedAppId]);

  // Form setup for creating compliance record
  const { register, handleSubmit, reset } = useForm({
    defaultValues: {
      milestoneNumber: 1,
      uploadedProofMetadata: '',
      inspectionDate: '',
      nextDueDate: '',
      officerRemarks: ''
    }
  });

  const onSubmitCompliance = async (data) => {
    setSubmitting(true);
    
    // Format LocalDateTime values to backend expected format (YYYY-MM-DDTHH:MM:SS)
    const formattedPayload = {
      applicationId: Number(selectedAppId),
      milestoneNumber: Number(data.milestoneNumber),
      uploadedProofMetadata: data.uploadedProofMetadata,
      inspectionDate: data.inspectionDate ? `${data.inspectionDate}T00:00:00` : null,
      nextDueDate: data.nextDueDate ? `${data.nextDueDate}T00:00:00` : null,
      officerRemarks: data.officerRemarks
    };

    try {
      const response = await axiosInstance.post('/v1/compliances', formattedPayload);
      if (response.data && response.data.success) {
        toast.success('Compliance evidence record submitted successfully!');
        reset();
        setShowSubmitForm(false);
        fetchCompliances(selectedAppId);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to submit compliance record.');
    } finally {
      setSubmitting(false);
    }
  };

  // Approve compliance
  const handleApprove = async (id) => {
    setSubmitting(true);
    try {
      const response = await axiosInstance.post(`/v1/compliances/${id}/approve`);
      if (response.data && response.data.success) {
        toast.success('Compliance approved! Next milestone release block removed.');
        fetchCompliances(selectedAppId);
      }
    } catch (err) {
      toast.error(err.message || 'Approval failed.');
    } finally {
      setSubmitting(false);
    }
  };

  // Reject compliance
  const handleReject = async (id) => {
    if (!rejectReason) {
      toast.error('Rejection remarks reason is required.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await axiosInstance.post(`/v1/compliances/${id}/reject?reason=${encodeURIComponent(rejectReason)}`);
      if (response.data && response.data.success) {
        toast.success('Compliance audit marked non-compliant.');
        setRejectingId(null);
        setRejectReason('');
        fetchCompliances(selectedAppId);
      }
    } catch (err) {
      toast.error(err.message || 'Rejection failed.');
    } finally {
      setSubmitting(false);
    }
  };

  // Calculate reminder status details
  const getReminderStatus = (item) => {
    if (item.status === 'COMPLIANT') return 'RESOLVED';
    if (!item.nextDueDate) return 'N/A';
    
    const dueDate = new Date(item.nextDueDate);
    const now = new Date();
    if (dueDate < now) {
      return 'OVERDUE (ALERT SENT)';
    }
    return 'PENDING CLEARANCE';
  };

  // Stats calculation
  const counts = {
    pending: compliances.filter(c => c.status === 'PENDING').length,
    compliant: compliances.filter(c => c.status === 'COMPLIANT').length,
    nonCompliant: compliances.filter(c => c.status === 'NON_COMPLIANT').length
  };

  return (
    <div className="space-y-6">
      <ToastContainer position="top-right" autoClose={3000} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-800">Compliance Audit & Reminders</h1>
          <p className="text-slate-500 mt-1">Review milestone utilization proofs, trigger onsite checks, and clear payment blockades.</p>
        </div>
        {selectedAppId && (
          <button
            onClick={() => setShowSubmitForm(!showSubmitForm)}
            className="flex h-10 items-center justify-center space-x-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 transition-all shadow-sm"
          >
            <Plus className="h-4 w-4" />
            <span>Submit Evidence</span>
          </button>
        )}
      </div>

      {/* Stats Counter */}
      <div className="grid gap-6 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Pending Reviews</p>
            <h3 className="text-3xl font-black text-amber-500 mt-2">{counts.pending}</h3>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-500">
            <Clock className="h-6 w-6" />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Compliant Clearances</p>
            <h3 className="text-3xl font-black text-emerald-500 mt-2">{counts.compliant}</h3>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-500">
            <ShieldCheck className="h-6 w-6" />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Non-Compliant Blocks</p>
            <h3 className="text-3xl font-black text-rose-500 mt-2">{counts.nonCompliant}</h3>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-50 text-rose-500">
            <ShieldAlert className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Submit Evidence Form modal-like */}
      {showSubmitForm && (
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm max-w-2xl">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 border-b border-slate-50 pb-2 mb-4">
            Upload Utilization Proof Evidence
          </h3>
          <form onSubmit={handleSubmit(onSubmitCompliance)} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Target Milestone Number</label>
                <select
                  {...register('milestoneNumber', { required: true })}
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
                >
                  <option value="1">Milestone 1</option>
                  <option value="2">Milestone 2</option>
                  <option value="3">Milestone 3</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Proof Document Reference</label>
                <input
                  type="text"
                  placeholder="e.g. GST-INVOICE-48201.pdf"
                  {...register('uploadedProofMetadata', { required: true })}
                  className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Inspection Schedule Date</label>
                <input
                  type="date"
                  {...register('inspectionDate')}
                  className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Next Review Due Date</label>
                <input
                  type="date"
                  {...register('nextDueDate')}
                  className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Initial Officer Remarks</label>
              <textarea
                rows={2}
                placeholder="Remarks about utilization proof verification progress..."
                {...register('officerRemarks')}
                className="w-full rounded-lg border border-slate-200 p-3 text-sm"
              />
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="submit"
                disabled={submitting}
                className="h-9 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-xs font-semibold text-white disabled:opacity-50"
              >
                Submit Evidence Proof
              </button>
              <button
                type="button"
                onClick={() => setShowSubmitForm(false)}
                className="h-9 px-4 rounded-lg border border-slate-200 text-xs font-semibold text-slate-500 hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Selector & Audit Table Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        
        {/* Left Column: Selector & Table */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* File Selector */}
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Select Application File to review compliances
            </label>
            <select
              value={selectedAppId}
              onChange={(e) => setSelectedAppId(e.target.value)}
              className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none cursor-pointer focus:border-govBlue"
            >
              <option value="">-- Choose Application File --</option>
              {applications.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.applicationNumber} - {a.beneficiary?.name || 'Citizen'}
                </option>
              ))}
            </select>
          </div>

          {/* Table */}
          {selectedAppId ? (
            listLoading ? (
              <div className="bg-white rounded-2xl border border-slate-100 py-12 shadow-sm">
                <LoadingSpinner size="medium" />
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-sm text-slate-500">
                    <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100">
                      <tr>
                        <th className="px-6 py-4">Milestone</th>
                        <th className="px-6 py-4">Evidence</th>
                        <th className="px-6 py-4">Due Date</th>
                        <th className="px-6 py-4">Alert Reminder</th>
                        <th className="px-6 py-4">Remarks</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {compliances.map((c) => (
                        <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 font-semibold text-slate-800">M#{c.milestoneNumber}</td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center space-x-1 text-xs text-blue-600 font-bold hover:underline cursor-pointer">
                              <FileText className="h-3.5 w-3.5" />
                              <span>{c.uploadedProofMetadata || 'No Proof uploaded'}</span>
                            </span>
                          </td>
                          <td className="px-6 py-4 text-xs font-semibold text-slate-700">
                            {c.nextDueDate ? new Date(c.nextDueDate).toLocaleDateString() : 'N/A'}
                          </td>
                          <td className="px-6 py-4 text-xs font-bold text-slate-500">
                            <span
                              className={`inline-block rounded px-1.5 py-0.5 text-[10px] ${
                                getReminderStatus(c).includes('OVERDUE')
                                  ? 'bg-rose-50 text-rose-600 border border-rose-100 animate-pulse'
                                  : 'bg-slate-50 text-slate-400'
                              }`}
                            >
                              {getReminderStatus(c)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-xs italic text-slate-400 line-clamp-1 max-w-[150px]">{c.officerRemarks || '--'}</td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                                c.status === 'COMPLIANT'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : c.status === 'PENDING'
                                  ? 'bg-amber-50 text-amber-700'
                                  : 'bg-rose-50 text-rose-700'
                              }`}
                            >
                              {c.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            {c.status === 'PENDING' && (
                              <div className="flex items-center justify-end space-x-2">
                                <button
                                  onClick={() => handleApprove(c.id)}
                                  disabled={submitting}
                                  className="rounded p-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-100"
                                  title="Approve Compliance"
                                >
                                  <Check className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => setRejectingId(c.id)}
                                  className="rounded p-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-100"
                                  title="Reject Compliance"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                      {compliances.length === 0 && (
                        <tr>
                          <td colSpan={7} className="px-6 py-10 text-center text-slate-400 font-semibold">
                            No compliance records registered for this application file.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          ) : (
            <div className="rounded-2xl border border-slate-100 bg-white p-20 shadow-sm text-center text-slate-400 font-semibold">
              <ShieldCheck className="h-10 w-10 mx-auto mb-2 text-slate-300 stroke-[1.5]" />
              <p>Select a citizen application to fetch compliance clearance lists.</p>
            </div>
          )}

          {/* Rejection input box (shown if clicking reject button) */}
          {rejectingId && (
            <div className="rounded-xl border border-rose-100 bg-rose-50/50 p-4 space-y-3">
              <div className="flex justify-between items-center">
                <p className="text-xs font-bold text-rose-700 flex items-center space-x-1">
                  <AlertTriangle className="h-4 w-4" />
                  <span>Provide Rejection Remarks Reason</span>
                </p>
                <button onClick={() => setRejectingId(null)} className="text-slate-400 hover:text-slate-600 text-xs">Cancel</button>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. GST receipt verification check failed."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="h-9 flex-1 rounded border border-rose-200 bg-white px-3 text-xs outline-none focus:border-rose-500"
                />
                <button
                  onClick={() => handleReject(rejectingId)}
                  disabled={submitting}
                  className="h-9 px-3 rounded bg-rose-600 hover:bg-rose-700 text-xs font-semibold text-white flex items-center gap-1"
                >
                  <Send className="h-3 w-3" />
                  <span>Submit Block</span>
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Right Column: Timeline View */}
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm space-y-6">
          <h3 className="text-lg font-bold text-slate-800 border-b border-slate-50 pb-2">
            Compliance Inspection Timeline
          </h3>
          
          {compliances.length === 0 ? (
            <div className="text-center text-slate-400 text-xs py-12 font-medium">
              No compliance schedule timelines available.
            </div>
          ) : (
            <div className="relative border-l border-slate-100 pl-4 space-y-6 ml-2">
              {compliances.map((c, i) => (
                <div key={i} className="relative text-xs">
                  {/* Timeline bullet dot */}
                  <span
                    className={`absolute -left-6 top-1.5 h-3 w-3 rounded-full border border-white ${
                      c.status === 'COMPLIANT' ? 'bg-emerald-600' : 'bg-slate-300'
                    }`}
                  ></span>
                  
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800">M#{c.milestoneNumber} Audit</span>
                      <span className="text-[10px] text-slate-400 font-semibold">
                        {c.inspectionDate ? new Date(c.inspectionDate).toLocaleDateString() : 'Unscheduled'}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 font-medium">Inspection Scheduled Date</p>
                    <p className="text-[10px] text-slate-400 font-semibold">
                      Proof: <span className="underline font-mono">{c.uploadedProofMetadata}</span>
                    </p>
                    {c.officerRemarks && (
                      <p className="text-slate-500 bg-slate-50 p-2 rounded text-[10px] italic leading-relaxed border border-slate-100">
                        Remarks: {c.officerRemarks}
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
