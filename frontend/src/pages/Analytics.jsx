import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import {
  Download, FileSpreadsheet, Award, TrendingUp,
  IndianRupee, Users, CheckCircle, AlertTriangle,
  Clock, RefreshCw, FileX, AlertCircle
} from 'lucide-react';
import axiosInstance from '../api/axiosInstance';
import LoadingSpinner from '../components/LoadingSpinner';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// ─── Colours ───────────────────────────────────────────────────────────────
const CHART_COLORS = ['#2563EB', '#3B82F6', '#60A5FA', '#93C5FD', '#1E40AF', '#7C3AED', '#0EA5E9', '#10B981'];

// ─── Helpers ────────────────────────────────────────────────────────────────
/** Safely format a number as Indian locale string */
const fmtNum = (n) => (n != null ? Number(n).toLocaleString('en-IN') : '—');
/** Safely format a currency value */
const fmtINR = (n) => (n != null && Number(n) > 0 ? `₹${Number(n).toLocaleString('en-IN')}` : '₹0');
/** Safe percentage string */
const fmtPct = (n) => (n != null ? `${Number(n).toFixed(1)}%` : '0.0%');

// ─── Empty Chart Placeholder ─────────────────────────────────────────────────
function EmptyChart({ message = 'No data available.' }) {
  return (
    <div className="h-72 flex flex-col items-center justify-center gap-3 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50">
      <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center">
        <FileX className="h-5 w-5 text-slate-300" />
      </div>
      <p className="text-xs font-bold text-slate-500">{message}</p>
    </div>
  );
}

// ─── Skeleton Card ───────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm flex items-center justify-between animate-pulse">
      <div className="space-y-2">
        <div className="h-2.5 w-28 bg-slate-200 rounded" />
        <div className="h-8 w-20 bg-slate-200 rounded mt-1" />
      </div>
      <div className="h-12 w-12 rounded-xl bg-slate-200" />
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
export default function Analytics() {
  const [report, setReport] = useState(null);           // AnalyticsReportDto from /v1/analytics/report
  const [applications, setApplications] = useState([]); // ApplicationDto[] from /v1/applications
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ── Fetch both analytics report and raw applications ──────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [reportRes, appsRes] = await Promise.all([
        axiosInstance.get('/v1/analytics/report'),
        axiosInstance.get('/v1/applications')
      ]);

      if (reportRes.data?.success) {
        setReport(reportRes.data.data);
      }
      if (appsRes.data?.success) {
        setApplications(appsRes.data.data || []);
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to load analytics data.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Derived counts from real application records ───────────────────────────
  const totalApplications = applications.length;
  const approvedCount = applications.filter(a =>
    ['APPROVED', 'DISBURSED', 'READY_FOR_DISBURSEMENT'].includes(a.workflowStatus)
  ).length;
  const rejectedCount = applications.filter(a =>
    ['REJECTED', 'DISTRICT_REJECTED'].includes(a.workflowStatus)
  ).length;
  const disbursedCount = applications.filter(a => a.workflowStatus === 'DISBURSED').length;
  const pendingCount = applications.filter(a =>
    ['SUBMITTED', 'UNDER_REVIEW', 'FIELD_VERIFICATION', 'DISTRICT_REVIEW',
     'FINANCE_REVIEW', 'RE_VERIFICATION_REQUESTED'].includes(a.workflowStatus) ||
    ['SUBMITTED', 'UNDER_REVIEW', 'FIELD_VERIFICATION', 'DISTRICT_REVIEW',
     'FINANCE_REVIEW', 'RE_VERIFICATION_REQUESTED'].includes(a.currentStage)
  ).length;

  // ── Chart datasets — built from real API data, empty arrays if no data ─────
  const districtChartData = report?.fundsReleasedByDistrict && Object.keys(report.fundsReleasedByDistrict).length > 0
    ? Object.entries(report.fundsReleasedByDistrict)
        .map(([name, value]) => ({ name, amount: Number(value) }))
        .sort((a, b) => b.amount - a.amount)
    : [];

  const stateChartData = report?.fundsReleasedByState && Object.keys(report.fundsReleasedByState).length > 0
    ? Object.entries(report.fundsReleasedByState)
        .map(([name, value]) => ({ name, value: Number(value) }))
        .sort((a, b) => b.value - a.value)
    : [];

  const schemeChartData = report?.applicationsByScheme && Object.keys(report.applicationsByScheme).length > 0
    ? Object.entries(report.applicationsByScheme)
        .map(([name, count]) => ({ name: name.length > 20 ? name.substring(0, 20) + '…' : name, fullName: name, count: Number(count) }))
        .sort((a, b) => b.count - a.count)
    : [];

  // Status breakdown from real applications for the pie chart
  const statusBreakdownData = [
    { name: 'Approved', value: approvedCount },
    { name: 'Rejected', value: rejectedCount },
    { name: 'Pending', value: pendingCount },
    { name: 'Disbursed', value: disbursedCount }
  ].filter(d => d.value > 0);  // only include statuses that have data

  // ── CSV Export — only real database records, no hardcoded values ──────────
  const handleExportCSV = () => {
    if (!report && applications.length === 0) {
      toast.warn('No data available for export.');
      return;
    }

    const rows = [
      ['Metric', 'Value'],
      ['Total Beneficiaries', report?.totalBeneficiaries ?? 0],
      ['Total Applications', totalApplications],
      ['Total Approved', approvedCount],
      ['Total Rejected', rejectedCount],
      ['Total Disbursed', disbursedCount],
      ['Total Pending', pendingCount],
      ['Total Funds Released (INR)', report?.totalFundsReleased ?? 0],
      ['Average Eligibility Score', report?.averageEligibilityScore != null ? Number(report.averageEligibilityScore).toFixed(2) : 0],
      ['Pending Verification Count', report?.pendingVerificationCount ?? 0],
      ['Approval Rate (%)', report?.approvalPercentage != null ? Number(report.approvalPercentage).toFixed(2) : 0],
      ['Rejection Rate (%)', report?.rejectionPercentage != null ? Number(report.rejectionPercentage).toFixed(2) : 0],
      ['Compliance Rate (%)', report?.compliancePercentage != null ? Number(report.compliancePercentage).toFixed(2) : 0],
      ['Most Popular Scheme', report?.mostPopularScheme && report.mostPopularScheme !== 'N/A' ? report.mostPopularScheme : 'No data'],
      ['Highest Fund Utilization District', report?.highestFundUtilizationDistrict && report.highestFundUtilizationDistrict !== 'N/A' ? report.highestFundUtilizationDistrict : 'No data'],
      [],
      ['--- District Fund Distribution ---'],
      ...districtChartData.map(d => [`District: ${d.name}`, `₹${d.amount.toLocaleString('en-IN')}`]),
      [],
      ['--- Scheme Application Volumes ---'],
      ...schemeChartData.map(d => [`Scheme: ${d.fullName}`, d.count])
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(r => r.join(',')).join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `analytics_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Analytics CSV exported successfully.');
  };

  const handlePrintReport = () => { window.print(); };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <ToastContainer position="top-right" autoClose={3000} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-800">Regional Analytics Dashboard</h1>
          <p className="text-slate-500 mt-1 text-sm">
            Aggregated fiscal metrics, distribution mapping, and compliance ratios — all from live database records.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            className="flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all shadow-sm cursor-pointer"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
          <button
            onClick={handlePrintReport}
            disabled={!report}
            className="flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all shadow-sm cursor-pointer disabled:opacity-40"
          >
            <Download className="h-4 w-4" />
            Print Report
          </button>
          <button
            onClick={handleExportCSV}
            disabled={!report && applications.length === 0}
            className="flex h-10 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-xs font-bold text-white hover:bg-blue-700 transition-all shadow-sm cursor-pointer disabled:opacity-40"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Error banner */}
      {error && !loading && (
        <div className="flex items-center gap-3 rounded-xl border border-rose-100 bg-rose-50 p-4 text-sm font-semibold text-rose-700">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
          <button onClick={fetchData} className="ml-auto flex items-center gap-1.5 rounded-lg bg-rose-100 px-3 py-1.5 text-xs font-bold hover:bg-rose-200 cursor-pointer">
            <RefreshCw className="h-3.5 w-3.5" /> Retry
          </button>
        </div>
      )}

      {/* No data at all */}
      {!loading && !error && !report && applications.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-4 py-24 text-center rounded-2xl border border-dashed border-slate-200 bg-slate-50">
          <div className="h-14 w-14 rounded-full bg-slate-100 flex items-center justify-center">
            <FileX className="h-7 w-7 text-slate-300" />
          </div>
          <div>
            <p className="text-base font-black text-slate-700">No Analytics Data Available</p>
            <p className="text-sm text-slate-400 mt-1">No finance reports have been generated yet. Data will appear once applications are processed.</p>
          </div>
          <button onClick={fetchData} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 cursor-pointer shadow-sm">
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
        </div>
      )}

      {/* KPI Cards Row — 8 cards showing real computed values */}
      {(loading || report || applications.length > 0) && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
            ) : (
              <>
                {/* Total Beneficiaries */}
                <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Beneficiaries</p>
                    <h3 className="text-2xl font-black text-slate-800 mt-1">
                      {report?.totalBeneficiaries != null ? fmtNum(report.totalBeneficiaries) : '—'}
                    </h3>
                    {(report?.totalBeneficiaries == null || report.totalBeneficiaries === 0) && (
                      <p className="text-[10px] text-slate-400 font-semibold mt-0.5">No beneficiaries registered.</p>
                    )}
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <Users className="h-6 w-6" />
                  </div>
                </div>

                {/* Total Funds Released */}
                <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Released Funds</p>
                    <h3 className="text-2xl font-black text-emerald-600 mt-1">
                      {fmtINR(report?.totalFundsReleased)}
                    </h3>
                    {(!report?.totalFundsReleased || Number(report.totalFundsReleased) === 0) && (
                      <p className="text-[10px] text-slate-400 font-semibold mt-0.5">No disbursement records found.</p>
                    )}
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                    <IndianRupee className="h-6 w-6" />
                  </div>
                </div>

                {/* Avg Eligibility Score */}
                <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Avg Eligibility Score</p>
                    <h3 className="text-2xl font-black text-purple-700 mt-1">
                      {report?.averageEligibilityScore != null && Number(report.averageEligibilityScore) > 0
                        ? `${Number(report.averageEligibilityScore).toFixed(1)}`
                        : '—'}
                    </h3>
                    {(!report?.averageEligibilityScore || Number(report.averageEligibilityScore) === 0) && (
                      <p className="text-[10px] text-slate-400 font-semibold mt-0.5">No eligibility records.</p>
                    )}
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                    <Award className="h-6 w-6" />
                  </div>
                </div>

                {/* Pending Actions Count */}
                <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Pending Actions</p>
                    <h3 className="text-2xl font-black text-amber-500 mt-1">
                      {report?.pendingVerificationCount != null ? fmtNum(report.pendingVerificationCount) : fmtNum(pendingCount)}
                    </h3>
                    {(report?.pendingVerificationCount === 0 || (report?.pendingVerificationCount == null && pendingCount === 0)) && (
                      <p className="text-[10px] text-slate-400 font-semibold mt-0.5">No pending verification tasks.</p>
                    )}
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-500">
                    <Clock className="h-6 w-6" />
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Secondary KPI row */}
          {!loading && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Applications</p>
                  <h3 className="text-xl font-black text-slate-800 mt-1">{fmtNum(totalApplications)}</h3>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                  <TrendingUp className="h-5 w-5" />
                </div>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Approved</p>
                  <h3 className="text-xl font-black text-emerald-600 mt-1">{fmtNum(approvedCount)}</h3>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <CheckCircle className="h-5 w-5" />
                </div>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Rejected</p>
                  <h3 className="text-xl font-black text-rose-600 mt-1">{fmtNum(rejectedCount)}</h3>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-500">
                  <AlertTriangle className="h-5 w-5" />
                </div>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Disbursed</p>
                  <h3 className="text-xl font-black text-blue-600 mt-1">{fmtNum(disbursedCount)}</h3>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <IndianRupee className="h-5 w-5" />
                </div>
              </div>
            </div>
          )}

          {/* Programme highlights — only real API values, no hardcoded fallbacks */}
          {!loading && report && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-xs font-semibold text-slate-600 flex justify-between items-center">
                <span>Most Popular Programme:</span>
                <span className="text-blue-600 font-bold">
                  {report.mostPopularScheme && report.mostPopularScheme !== 'N/A'
                    ? report.mostPopularScheme
                    : <span className="text-slate-400 font-semibold">No data available</span>}
                </span>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-xs font-semibold text-slate-600 flex justify-between items-center">
                <span>Highest Fund Utilization District:</span>
                <span className="text-emerald-600 font-bold">
                  {report.highestFundUtilizationDistrict && report.highestFundUtilizationDistrict !== 'N/A'
                    ? report.highestFundUtilizationDistrict
                    : <span className="text-slate-400 font-semibold">No data available</span>}
                </span>
              </div>
            </div>
          )}

          {/* Charts Grid */}
          {!loading && (
            <div className="grid gap-6 lg:grid-cols-2">

              {/* District Funds Bar Chart */}
              <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                  Funds Released by District (₹)
                </h3>
                {districtChartData.length > 0 ? (
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={districtChartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" stroke="#94A3B8" fontSize={11} tickLine={false} />
                        <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                        <Tooltip formatter={(value) => [`₹${Number(value).toLocaleString('en-IN')}`, 'Funds Released']} />
                        <Bar dataKey="amount" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <EmptyChart message="No district-wise fund distribution data found." />
                )}
              </div>

              {/* State Funds Pie Chart */}
              <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                  Funds Distribution by State
                </h3>
                {stateChartData.length > 0 ? (
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={stateChartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={4}
                          dataKey="value"
                        >
                          {stateChartData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => [`₹${Number(value).toLocaleString('en-IN')}`, 'Funds']} />
                        <Legend formatter={(value) => <span className="text-xs text-slate-600 font-semibold">{value}</span>} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <EmptyChart message="No state-wise fund distribution data found." />
                )}
              </div>

              {/* Applications by Scheme Horizontal Bar */}
              <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                  Applications Volume by Scheme
                </h3>
                {schemeChartData.length > 0 ? (
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={schemeChartData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" stroke="#94A3B8" fontSize={11} tickLine={false} />
                        <YAxis dataKey="name" type="category" stroke="#94A3B8" fontSize={10} tickLine={false} width={120} />
                        <Tooltip formatter={(value, name, props) => [value, props.payload.fullName || 'Applications']} />
                        <Bar dataKey="count" fill="#60A5FA" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <EmptyChart message="No scheme-wise application volume data found." />
                )}
              </div>

              {/* Applications by Status Pie */}
              <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                  Applications by Status
                </h3>
                {statusBreakdownData.length > 0 ? (
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={statusBreakdownData}
                          cx="50%"
                          cy="50%"
                          outerRadius={90}
                          paddingAngle={3}
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          labelLine={false}
                        >
                          {statusBreakdownData.map((_, index) => (
                            <Cell key={`status-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value, name) => [value, name]} />
                        <Legend formatter={(value) => <span className="text-xs text-slate-600 font-semibold">{value}</span>} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <EmptyChart message="No application status data found." />
                )}
              </div>

              {/* Quality Ratios — full width, real percentages only */}
              <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm space-y-4 lg:col-span-2">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                  Operational Quality Ratios
                </h3>
                {report ? (
                  <div className="grid gap-6 sm:grid-cols-3 text-center">
                    {/* Approval Rate */}
                    <div className="space-y-2 p-4 rounded-xl bg-slate-50 border border-slate-100">
                      <p className="text-xs font-bold text-slate-400 uppercase">Application Approval Rate</p>
                      <p className="text-3xl font-black text-emerald-600">{fmtPct(report.approvalPercentage)}</p>
                      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-emerald-500 h-full rounded-full transition-all"
                          style={{ width: `${Math.min(100, Math.max(0, report.approvalPercentage || 0))}%` }}
                        />
                      </div>
                      {(!report.approvalPercentage || report.approvalPercentage === 0) && (
                        <p className="text-[10px] text-slate-400">No approved applications yet.</p>
                      )}
                    </div>

                    {/* Rejection Rate */}
                    <div className="space-y-2 p-4 rounded-xl bg-slate-50 border border-slate-100">
                      <p className="text-xs font-bold text-slate-400 uppercase">Application Rejection Rate</p>
                      <p className="text-3xl font-black text-rose-600">{fmtPct(report.rejectionPercentage)}</p>
                      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-rose-500 h-full rounded-full transition-all"
                          style={{ width: `${Math.min(100, Math.max(0, report.rejectionPercentage || 0))}%` }}
                        />
                      </div>
                      {(!report.rejectionPercentage || report.rejectionPercentage === 0) && (
                        <p className="text-[10px] text-slate-400">No rejected applications.</p>
                      )}
                    </div>

                    {/* Compliance Rate */}
                    <div className="space-y-2 p-4 rounded-xl bg-slate-50 border border-slate-100">
                      <p className="text-xs font-bold text-slate-400 uppercase">Milestone Compliance Rate</p>
                      <p className="text-3xl font-black text-blue-600">{fmtPct(report.compliancePercentage)}</p>
                      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-blue-600 h-full rounded-full transition-all"
                          style={{ width: `${Math.min(100, Math.max(0, report.compliancePercentage || 0))}%` }}
                        />
                      </div>
                      {(!report.compliancePercentage || report.compliancePercentage === 0) && (
                        <p className="text-[10px] text-slate-400">No compliance records found.</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-sm text-slate-400 font-semibold">
                    No finance reports generated yet.
                  </div>
                )}
              </div>

            </div>
          )}

          {/* Loading skeleton for charts */}
          {loading && (
            <div className="grid gap-6 lg:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm animate-pulse">
                  <div className="h-4 w-40 bg-slate-200 rounded mb-4" />
                  <div className="h-72 bg-slate-100 rounded-xl" />
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
