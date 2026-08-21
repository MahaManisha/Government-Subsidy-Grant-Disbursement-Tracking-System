import React, { useState, useEffect } from 'react';
import { IndianRupee, ArrowUpRight, CheckCircle, Clock, Trash2, ShieldAlert, Cpu, Calendar, Plus } from 'lucide-react';
import axiosInstance from '../api/axiosInstance';
import LoadingSpinner from '../components/LoadingSpinner';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function Disbursement({ isSelfStatus }) {
  const [plans, setPlans] = useState([]);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Officers lookup
  const [officers, setOfficers] = useState([]);
  const [selectedOfficerId, setSelectedOfficerId] = useState('');

  // Approved applications (without plans) lookup
  const [approvedApplications, setApprovedApplications] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  
  // Create Plan Form states
  const [newPlan, setNewPlan] = useState({
    applicationId: '',
    m1Percent: 40,
    m2Percent: 30,
    m3Percent: 30
  });

  // Fetch all plans
  const fetchPlans = async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.get('/v1/disbursement-plans');
      if (response.data && response.data.success) {
        const list = response.data.data || [];
        setPlans(list);
        
        // If a plan was selected previously, update its reference
        if (selectedPlanId) {
          const updatedSelected = list.find(p => p.id === Number(selectedPlanId));
          if (updatedSelected) {
            setSelectedPlan(updatedSelected);
          }
        }
      }
    } catch (err) {
      toast.error(err.message || 'Failed to retrieve disbursement plans.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch users (for Finance Officer ID dropdown)
  const fetchOfficers = async () => {
    try {
      const response = await axiosInstance.get('/v1/users');
      if (response.data && response.data.success) {
        setOfficers(response.data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch officers:', err);
    }
  };

  // Load applications from API to find approved ones without plans
  const loadApprovedApplications = async () => {
    try {
      const response = await axiosInstance.get('/v1/applications');
      if (response.data && response.data.success) {
        const list = response.data.data || [];
        const approved = list.filter(app =>
          app.workflowStatus === 'FINANCE_APPROVED' ||
          app.workflowStatus === 'APPROVED' ||
          app.workflowStatus === 'READY_FOR_DISBURSEMENT' ||
          app.workflowStatus === 'DISBURSED'
        );
        setApprovedApplications(approved);
      }
    } catch (err) {
      console.error('Failed to load approved applications:', err);
    }
  };

  useEffect(() => {
    if (isSelfStatus) {
      // Fetch plan for application ID 1
      const fetchSelfPlan = async () => {
        setLoading(true);
        try {
          const response = await axiosInstance.get('/v1/disbursement-plans/application/1');
          if (response.data && response.data.success) {
            setSelectedPlan(response.data.data);
          }
        } catch (err) {
          console.log('No disbursement plan generated for this application yet.');
        } finally {
          setLoading(false);
        }
      };
      fetchSelfPlan();
    } else {
      fetchPlans();
      fetchOfficers();
      loadApprovedApplications();
    }
  }, [isSelfStatus]);

  // Fetch single plan details when selected
  const fetchPlanDetails = async (id) => {
    if (!id) {
      setSelectedPlan(null);
      return;
    }
    setDetailsLoading(true);
    try {
      const response = await axiosInstance.get(`/v1/disbursement-plans/${id}`);
      if (response.data && response.data.success) {
        setSelectedPlan(response.data.data);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to fetch plan details.');
    } finally {
      setDetailsLoading(false);
    }
  };

  useEffect(() => {
    fetchPlanDetails(selectedPlanId);
  }, [selectedPlanId]);

  // Create Plan Submission
  const handleCreatePlan = async (e) => {
    e.preventDefault();
    if (!newPlan.applicationId) {
      toast.error('Please select an application.');
      return;
    }

    const sum = Number(newPlan.m1Percent) + Number(newPlan.m2Percent) + Number(newPlan.m3Percent);
    if (sum !== 100) {
      toast.error(`Milestones percentage sum must be exactly 100%. Current sum: ${sum}%`);
      return;
    }

    setSubmitting(true);
    
    // Find the application object to get approvedAmount
    const selectedApp = approvedApplications.find(a => a.id === Number(newPlan.applicationId));
    const approvedAmount = selectedApp ? selectedApp.approvedAmount || selectedApp.requestedAmount : 100000;

    const payload = {
      applicationId: Number(newPlan.applicationId),
      milestones: [
        { milestoneNumber: 1, percentage: Number(newPlan.m1Percent), amount: (approvedAmount * Number(newPlan.m1Percent)) / 100 },
        { milestoneNumber: 2, percentage: Number(newPlan.m2Percent), amount: (approvedAmount * Number(newPlan.m2Percent)) / 100 },
        { milestoneNumber: 3, percentage: Number(newPlan.m3Percent), amount: (approvedAmount * Number(newPlan.m3Percent)) / 100 }
      ]
    };

    try {
      const response = await axiosInstance.post('/v1/disbursement-plans', payload);
      if (response.data && response.data.success) {
        toast.success('Disbursement Plan configured and saved successfully!');
        setShowCreateForm(false);
        setNewPlan({ applicationId: '', m1Percent: 40, m2Percent: 30, m3Percent: 30 });
        
        // Refresh plans
        const updatedResponse = await axiosInstance.get('/v1/disbursement-plans');
        if (updatedResponse.data && updatedResponse.data.success) {
          const list = updatedResponse.data.data || [];
          setPlans(list);
          // Set selection to the new plan
          const newCreated = response.data.data;
          if (newCreated) {
            setSelectedPlanId(newCreated.id);
          }
        }
      }
    } catch (err) {
      toast.error(err.message || 'Failed to create plan.');
    } finally {
      setSubmitting(false);
    }
  };

  // Release milestone payment
  const handleReleaseMilestone = async (milestoneNumber) => {
    if (!selectedPlanId) return;
    if (!selectedOfficerId) {
      toast.error('Please select a Finance Officer ID.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await axiosInstance.post(
        `/v1/disbursement-plans/${selectedPlanId}/milestones/${milestoneNumber}/release?financeOfficerId=${selectedOfficerId}`
      );
      if (response.data && response.data.success) {
        toast.success(`Milestone ${milestoneNumber} payment released successfully!`);
        
        // Sync application state in localStorage
        const stored = localStorage.getItem('applications_ledger');
        if (stored) {
          const list = JSON.parse(stored);
          const updated = list.map(app => {
            if (app.id === selectedPlan.applicationId) {
              return {
                ...app,
                workflowStatus: milestoneNumber === 3 ? 'DISBURSED' : 'READY_FOR_DISBURSEMENT',
                currentStage: milestoneNumber === 3 ? 'COMPLETED' : app.currentStage
              };
            }
            return app;
          });
          localStorage.setItem('applications_ledger', JSON.stringify(updated));
        }

        // Refresh plan details
        fetchPlanDetails(selectedPlanId);
      }
    } catch (err) {
      toast.error(err.message || 'Milestone release blocked.');
    } finally {
      setSubmitting(false);
    }
  };

  // Budget calculations
  let totalAllocated = 0;
  let totalReleased = 0;
  let remainingAmount = 0;
  let utilizationPercent = 0;

  if (selectedPlan && selectedPlan.milestones) {
    totalAllocated = selectedPlan.milestones.reduce((acc, m) => acc + (m.amount || 0), 0);
    totalReleased = selectedPlan.milestones
      .filter(m => m.paymentStatus === 'SUCCESS')
      .reduce((acc, m) => acc + (m.amount || 0), 0);
    remainingAmount = totalAllocated - totalReleased;
    utilizationPercent = totalAllocated > 0 ? (totalReleased / totalAllocated) * 100 : 0;
  }

  return (
    <div className="space-y-6">
      <ToastContainer position="top-right" autoClose={3000} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-800">
            {isSelfStatus ? 'My Disbursement Milestones' : 'Disbursement Milestone Dashboard'}
          </h1>
          <p className="text-slate-500 mt-1">
            {isSelfStatus 
              ? 'Track payments schedules and NEFT deposit transfer states for your approved grant application.'
              : 'Configure grant milestones schedules and release direct payments upon compliance clearance.'}
          </p>
        </div>
        {!isSelfStatus && (
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="flex h-10 items-center justify-center space-x-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 transition-all shadow-sm"
          >
            <Plus className="h-4 w-4" />
            <span>Configure New Plan</span>
          </button>
        )}
      </div>

      {/* Create Plan Toggle Form */}
      {showCreateForm && (
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm max-w-2xl space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 border-b border-slate-50 pb-2">
            Configure Milestones Plan
          </h3>
          <form onSubmit={handleCreatePlan} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Select Approved Application</label>
              <select
                value={newPlan.applicationId}
                onChange={(e) => setNewPlan({ ...newPlan, applicationId: e.target.value })}
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none"
              >
                <option value="">-- Select Application --</option>
                {approvedApplications.map(app => (
                  <option key={app.id} value={app.id}>
                    {app.applicationNumber} - {app.beneficiary?.name} ({app.scheme?.name})
                  </option>
                ))}
              </select>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Milestone 1 (%)</label>
                <input
                  type="number"
                  value={newPlan.m1Percent}
                  onChange={(e) => setNewPlan({ ...newPlan, m1Percent: Number(e.target.value) })}
                  className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Milestone 2 (%)</label>
                <input
                  type="number"
                  value={newPlan.m2Percent}
                  onChange={(e) => setNewPlan({ ...newPlan, m2Percent: Number(e.target.value) })}
                  className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Milestone 3 (%)</label>
                <input
                  type="number"
                  value={newPlan.m3Percent}
                  onChange={(e) => setNewPlan({ ...newPlan, m3Percent: Number(e.target.value) })}
                  className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="submit"
                disabled={submitting}
                className="h-9 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-xs font-semibold text-white disabled:opacity-50"
              >
                Create Disbursement Plan
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="h-9 px-4 rounded-lg border border-slate-200 text-xs font-semibold text-slate-500 hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        
        {/* Left Column: Plan Select */}
        <div className="lg:col-span-2 space-y-6">
          {/* Plan Selector */}
          {!isSelfStatus && (
            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm space-y-4">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                Select Active Disbursement Plan
              </label>
              <select
                value={selectedPlanId}
                onChange={(e) => setSelectedPlanId(e.target.value)}
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none cursor-pointer focus:border-govBlue"
              >
                <option value="">-- Choose Active Plan --</option>
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    Plan #{p.id} (Status: {p.status})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Details & Milestones Display */}
          {selectedPlan ? (
            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-slate-50 pb-3">
                <h3 className="text-lg font-bold text-slate-800">Plan #{selectedPlan.id} Milestones</h3>
                <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-bold text-blue-600 uppercase">
                  {selectedPlan.status}
                </span>
              </div>

              {/* Progress metrics */}
              <div className="grid gap-4 sm:grid-cols-3 text-sm bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div>
                  <p className="text-slate-400 text-xs">Total Plan Budget</p>
                  <p className="font-black text-slate-800 mt-0.5">₹{totalAllocated.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-xs">Total Funds Released</p>
                  <p className="font-black text-emerald-600 mt-0.5">₹{totalReleased.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-xs">Remaining Balance</p>
                  <p className="font-black text-slate-800 mt-0.5">₹{remainingAmount.toLocaleString()}</p>
                </div>
              </div>

              {/* Linear Progress Bar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                  <span>Released percentage</span>
                  <span className="text-blue-600 font-bold">{utilizationPercent.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden border border-slate-50">
                  <div
                    className="h-full bg-blue-600 rounded-full transition-all duration-500"
                    style={{ width: `${utilizationPercent}%` }}
                  ></div>
                </div>
              </div>

              {/* Officer selector for release trigger */}
              <div className="border-t border-slate-100 pt-6">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Select Finance Officer (Required for Release) *
                </label>
                <select
                  value={selectedOfficerId}
                  onChange={(e) => setSelectedOfficerId(e.target.value)}
                  className="h-10 w-full sm:w-80 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none cursor-pointer"
                >
                  <option value="">-- Choose Finance Account --</option>
                  {officers.map(o => (
                    <option key={o.id} value={o.id}>{o.firstName} {o.lastName} ({o.username})</option>
                  ))}
                </select>
              </div>

              {/* Milestones grid */}
              <div className="grid gap-6 sm:grid-cols-3">
                {selectedPlan.milestones?.map((m) => (
                  <div key={m.milestoneNumber} className="rounded-xl bg-slate-50 border border-slate-100 p-4 flex flex-col justify-between h-44">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full uppercase">
                        Milestone {m.milestoneNumber} ({m.percentage}%)
                      </span>
                      <span
                        className={`inline-flex items-center space-x-1 rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                          m.paymentStatus === 'SUCCESS' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {m.paymentStatus === 'SUCCESS' ? <CheckCircle className="h-3 w-3 mr-1" /> : <Clock className="h-3 w-3 mr-1" />}
                        <span>{m.paymentStatus}</span>
                      </span>
                    </div>

                    <div>
                      <p className="text-xl font-black text-slate-800">₹{m.amount?.toLocaleString()}</p>
                      <p className="text-[10px] text-slate-400 mt-1 font-semibold flex items-center">
                        <Calendar className="h-3.5 w-3.5 mr-1" />
                        <span>Date: {m.scheduledDate ? new Date(m.scheduledDate).toLocaleDateString() : 'N/A'}</span>
                      </p>
                    </div>

                    {m.paymentStatus === 'PENDING' ? (
                      isSelfStatus ? (
                        <div className="text-[10px] font-bold text-amber-700 flex items-center space-x-1 bg-amber-50 border border-amber-100 py-1.5 rounded-lg justify-center">
                          <span>Pending Compliance Verification</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleReleaseMilestone(m.milestoneNumber)}
                          disabled={submitting || !selectedOfficerId}
                          className="w-full h-8 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-xs font-semibold text-white transition-all flex items-center justify-center space-x-1"
                        >
                          <IndianRupee className="h-3 w-3" />
                          <span>Release funds</span>
                        </button>
                      )
                    ) : (
                      <div className="text-[10px] font-bold text-emerald-700 flex items-center space-x-1 bg-emerald-50 border border-emerald-100 py-1.5 rounded-lg justify-center">
                        <ArrowUpRight className="h-3.5 w-3.5 animate-bounce" />
                        <span>NEFT Deposit Transferred</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

            </div>
          ) : (
            <div className="rounded-2xl border border-slate-100 bg-white p-20 shadow-sm text-center text-slate-400 font-semibold">
              <Cpu className="h-10 w-10 mx-auto mb-2 text-slate-300 stroke-[1.5]" />
              <p>Select a disbursement plan file to load milestones.</p>
            </div>
          )}
        </div>

        {/* Right Column: Timeline View */}
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm space-y-6">
          <h3 className="text-lg font-bold text-slate-800 border-b border-slate-50 pb-2">
            Disbursement Release Timeline
          </h3>

          {!selectedPlan ? (
            <div className="text-center text-slate-400 text-xs py-12 font-medium">
              Select a plan file to load timeline.
            </div>
          ) : (
            <div className="relative border-l border-slate-100 pl-4 space-y-6 ml-2">
              {selectedPlan.milestones?.map((m, i) => {
                const isReleased = m.paymentStatus === 'SUCCESS';
                return (
                  <div key={i} className="relative text-xs">
                    {/* Timeline bullet dot */}
                    <span
                      className={`absolute -left-6 top-1.5 h-3 w-3 rounded-full border border-white ${
                        isReleased ? 'bg-emerald-600' : 'bg-slate-300'
                      }`}
                    ></span>
                    
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800">Milestone {m.milestoneNumber} ({m.percentage}%)</span>
                        <span className="text-[10px] text-slate-400 font-semibold">
                          {m.scheduledDate ? new Date(m.scheduledDate).toLocaleDateString() : 'N/A'}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 font-medium">Amount: ₹{m.amount?.toLocaleString()}</p>
                      <p className="text-[10px] text-slate-400 font-semibold flex items-center space-x-1">
                        <span>Status: </span>
                        <span className={isReleased ? 'text-emerald-600' : 'text-amber-600'}>{m.paymentStatus}</span>
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
