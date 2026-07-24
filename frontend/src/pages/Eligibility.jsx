import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Award, Check, X, ShieldAlert, Cpu, HelpCircle } from 'lucide-react';
import axiosInstance from '../api/axiosInstance';
import LoadingSpinner from '../components/LoadingSpinner';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function Eligibility() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [result, setResult] = useState(null);

  // Load applications from localStorage
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

  const { register, handleSubmit, watch } = useForm({
    defaultValues: {
      applicationId: ''
    }
  });

  const selectedAppId = watch('applicationId');

  const onEvaluate = async (data) => {
    if (!data.applicationId) {
      toast.error('Please select an application to evaluate.');
      return;
    }

    setEvaluating(true);
    setResult(null);

    try {
      const response = await axiosInstance.post(`/v1/applications/${data.applicationId}/score`);
      if (response.data && response.data.success) {
        const payload = response.data.data;
        setResult(payload);
        toast.success(`Scoring engine run completed successfully!`);

        // Sync the result back to localStorage
        const stored = localStorage.getItem('applications_ledger');
        if (stored) {
          const list = JSON.parse(stored);
          const updated = list.map(app => {
            if (app.id === Number(data.applicationId)) {
              return {
                ...app,
                eligibilityScore: payload.totalScore,
                workflowStatus: payload.eligibilityResult === 'ELIGIBLE' ? 'APPROVED' : 'REJECTED',
                approvedAmount: payload.eligibilityResult === 'ELIGIBLE' ? app.requestedAmount : null
              };
            }
            return app;
          });
          localStorage.setItem('applications_ledger', JSON.stringify(updated));
          // Refresh applications dropdown listing state
          setApplications(updated);
        }
      }
    } catch (err) {
      toast.error(err.message || 'Failed to execute eligibility evaluation.');
    } finally {
      setEvaluating(false);
    }
  };

  // Determine color indicator classes based on score
  const getScoreColorClass = (score) => {
    if (score >= 80) return { text: 'text-emerald-600', bg: 'bg-emerald-500', bgLight: 'bg-emerald-50', border: 'border-emerald-200' }; // Green
    if (score >= 50) return { text: 'text-amber-600', bg: 'bg-amber-500', bgLight: 'bg-amber-50', border: 'border-amber-200' };   // Yellow
    return { text: 'text-rose-600', bg: 'bg-rose-500', bgLight: 'bg-rose-50', border: 'border-rose-200' };      // Red
  };

  const currentSelectedApp = applications.find(a => a.id === Number(selectedAppId));

  return (
    <div className="space-y-6">
      <ToastContainer position="top-right" autoClose={3000} />

      {/* Header */}
      <div>
        <h1 className="text-2xl font-black tracking-tight text-slate-800">Eligibility Engine Simulator</h1>
        <p className="text-slate-500 mt-1">Connect to active Spring Boot business rules and execute scoring audits on files.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Form selection */}
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center space-x-2">
              <Cpu className="h-5 w-5 text-blue-600 animate-pulse" />
              <span>Scoring Execution Trigger</span>
            </h3>
            
            <form onSubmit={handleSubmit(onEvaluate)} className="space-y-6">
              {/* Select Application */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Choose Application File
                </label>
                <select
                  {...register('applicationId', { required: true })}
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none cursor-pointer focus:border-govBlue"
                >
                  <option value="">-- Select Pending/Submitted File --</option>
                  {applications.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.applicationNumber} - {a.beneficiary?.name || 'Unlinked'} ({a.scheme?.name || 'Scheme'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Show preview details if selected */}
              {currentSelectedApp && (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-xs space-y-2">
                  <p className="font-bold text-slate-700 border-b border-slate-200 pb-1.5 mb-2">File Specs Preview</p>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Beneficiary:</span>
                    <span className="font-semibold text-slate-700">{currentSelectedApp.beneficiary?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Requested Amount:</span>
                    <span className="font-semibold text-slate-700">₹{currentSelectedApp.requestedAmount?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Current Status:</span>
                    <span className="font-semibold text-slate-700 uppercase">{currentSelectedApp.workflowStatus}</span>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={evaluating}
                className="h-10 w-full rounded-lg bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700 transition-all flex items-center justify-center space-x-2 shadow-sm disabled:opacity-50"
              >
                {evaluating ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-t-white border-blue-600" />
                ) : (
                  <Award className="h-4 w-4" />
                )}
                <span>Run Eligibility scoring</span>
              </button>
            </form>
          </div>

          <div className="mt-6 border-t border-slate-50 pt-4 flex items-center space-x-2 text-[10px] text-slate-400 font-semibold">
            <HelpCircle className="h-4 w-4 text-blue-500" />
            <span>Scores calculated automatically using backend Drools/Rule units.</span>
          </div>
        </div>

        {/* Results Pane */}
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-800 mb-4">Rule Scorecard Output</h3>
            
            {evaluating ? (
              <div className="flex flex-col items-center justify-center h-64 text-slate-400 text-center">
                <LoadingSpinner size="medium" />
                <p className="font-semibold text-xs mt-4">Running rule evaluations on server...</p>
              </div>
            ) : !result ? (
              <div className="flex flex-col items-center justify-center h-64 text-slate-400 text-center">
                <Award className="h-12 w-12 mb-3 stroke-[1.5]" />
                <p className="font-semibold text-xs">Run a scorecard audit trigger to display rule contributes.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Result header banner */}
                {(() => {
                  const colors = getScoreColorClass(result.totalScore);
                  return (
                    <div className={`p-4 rounded-xl border ${colors.border} ${colors.bgLight} flex items-center justify-between`}>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Scoring Engine Status</p>
                        <span className={`inline-block mt-1 font-black text-sm uppercase tracking-wider ${colors.text}`}>
                          {result.eligibilityResult}
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Eligibility Score</p>
                        <p className="text-2xl font-black text-slate-800 mt-1">{result.totalScore}/100</p>
                      </div>
                    </div>
                  );
                })()}

                {/* Score Progress Bar */}
                {(() => {
                  const colors = getScoreColorClass(result.totalScore);
                  return (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                        <span>Threshold Limit: {result.eligibleThreshold || 80}+</span>
                        <span>Evaluation Contribution</span>
                      </div>
                      <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden border border-slate-50">
                        <div
                          className={`h-full rounded-full ${colors.bg} transition-all duration-500`}
                          style={{ width: `${result.totalScore}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })()}

                {/* Rules Contributes Checklist */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3">Contributions Breakdown</p>
                  <div className="space-y-2.5">
                    {result.ruleBreakdown?.map((rule, i) => (
                      <div key={i} className="flex items-center justify-between text-xs py-1.5 border-b border-slate-50 last:border-0">
                        <div>
                          <p className="font-semibold text-slate-700">{rule.ruleName}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">{rule.description}</p>
                        </div>
                        <div className="flex items-center space-x-2.5">
                          <span className={`font-bold ${rule.passed ? 'text-emerald-600' : 'text-slate-400'}`}>
                            {rule.scoreAwarded > 0 ? `+${rule.scoreAwarded}` : '0'}
                          </span>
                          {rule.passed ? (
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 font-bold">
                              <Check className="h-3 w-3" />
                            </span>
                          ) : (
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-50 text-rose-600 font-bold">
                              <X className="h-3 w-3" />
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            )}
          </div>

          {result && (
            <div className="mt-6 border-t border-slate-50 pt-4 flex items-center space-x-2 text-[10px] font-semibold text-slate-400">
              <ShieldAlert className="h-4.5 w-4.5 text-blue-500" />
              <span>Calculated from live parameters matching target rulesets.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
