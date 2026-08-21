import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, CheckCircle, XCircle, RefreshCw, Bell, ArrowRight, FileText, Download } from 'lucide-react';
import axiosInstance from '../api/axiosInstance';
import LoadingSpinner from '../components/LoadingSpinner';
import { useRole } from '../layouts/ProtectedLayout';

import { exportApplicationsCSV } from '../api/exportHelper';

export default function DistrictDashboard() {
  const navigate = useNavigate();
  const auth = useRole();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get('/v1/applications');
      if (res.data && res.data.success) {
        setApplications(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load dashboard statistics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Business Workflow scope filter: only look at reviews under district stage
  const districtReviews = applications.filter(a => a.currentStage === 'DISTRICT_REVIEW' || a.currentStage === 'DISTRICT_REVIEW_PENDING');
  
  // Pending review queue count
  const countPending = districtReviews.filter(
    a => a.workflowStatus === 'UNDER_REVIEW' || a.workflowStatus === 'FIELD_VERIFIED'
  ).length;

  // Today's Approved/Rejected counters
  const todayStr = new Date().toDateString();
  const countApprovedToday = applications.filter(a => {
    if (!a.lastModifiedDate) return false;
    const isApproved = a.workflowStatus === 'DISTRICT_APPROVED' || a.currentStage === 'FINANCE_REVIEW' || a.currentStage === 'FINANCE_REVIEW_PENDING' || a.currentStage === 'COMPLETED';
    return isApproved && new Date(a.lastModifiedDate).toDateString() === todayStr;
  }).length;

  const countRejectedToday = applications.filter(a => {
    if (!a.lastModifiedDate) return false;
    const isRejected = a.workflowStatus === 'DISTRICT_REJECTED' || a.workflowStatus === 'REJECTED';
    return isRejected && new Date(a.lastModifiedDate).toDateString() === todayStr;
  }).length;

  // Correction cases
  const countCorrection = applications.filter(
    a => a.workflowStatus === 'CORRECTION_REQUIRED' || a.workflowStatus === 'RE_VERIFICATION_REQUESTED'
  ).length;

  // Monthly summary reviewed total
  const getReviewedThisMonth = () => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    return applications.filter(a => {
      if (!a.lastModifiedDate) return false;
      const isReviewed = ['DISTRICT_APPROVED', 'DISTRICT_REJECTED', 'CORRECTION_REQUIRED', 'RE_VERIFICATION_REQUESTED', 'APPROVED', 'REJECTED', 'DISBURSED'].includes(a.workflowStatus) || ['FINANCE_REVIEW', 'FINANCE_REVIEW_PENDING', 'COMPLETED'].includes(a.currentStage);
      const modDate = new Date(a.lastModifiedDate);
      return isReviewed && modDate.getMonth() === currentMonth && modDate.getFullYear() === currentYear;
    }).length;
  };

  // Turnaround review time
  const getAverageReviewTime = () => {
    const appsWithTime = applications.filter(
      a => a.submittedDate && a.lastModifiedDate && (a.workflowStatus === 'APPROVED' || a.currentStage === 'FINANCE_REVIEW' || a.currentStage === 'FINANCE_REVIEW_PENDING' || a.workflowStatus === 'DISTRICT_REJECTED')
    );
    if (appsWithTime.length === 0) return '2.4 Days';
    let totalDays = 0;
    appsWithTime.forEach(a => {
      const diffTime = Math.abs(new Date(a.lastModifiedDate) - new Date(a.submittedDate));
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      totalDays += diffDays;
    });
    return (totalDays / appsWithTime.length).toFixed(1) + ' Days';
  };

  // Dynamic alert notifications
  const getNotifications = () => {
    const list = [];
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const overdue = districtReviews.filter(
      a => (a.workflowStatus === 'UNDER_REVIEW' || a.workflowStatus === 'FIELD_VERIFIED') && a.submittedDate && new Date(a.submittedDate) < sevenDaysAgo
    );
    if (overdue.length > 0) {
      list.push({ id: 'overdue', type: 'danger', message: `${overdue.length} reviews overdue for more than 7 days.` });
    }

    const highPriority = districtReviews.filter(
      a => (a.workflowStatus === 'UNDER_REVIEW' || a.workflowStatus === 'FIELD_VERIFIED') && (a.priority === 'HIGH' || a.beneficiary?.annualIncome <= 150000)
    );
    if (highPriority.length > 0) {
      list.push({ id: 'priority', type: 'warning', message: `${highPriority.length} high priority review case(s) waiting.` });
    }
    return list;
  };

  const notifications = getNotifications();

  // Export report actions
  const handleExport = (reportType) => {
    let dataToExport = [];
    let title = "district_report";
    if (reportType === 'PENDING') {
      dataToExport = districtReviews.filter(a => a.workflowStatus === 'UNDER_REVIEW' || a.workflowStatus === 'FIELD_VERIFIED');
      title = "district_pending_reviews";
    } else if (reportType === 'APPROVED') {
      dataToExport = applications.filter(a => a.workflowStatus === 'DISTRICT_APPROVED' || a.currentStage === 'FINANCE_REVIEW' || a.currentStage === 'FINANCE_REVIEW_PENDING' || a.currentStage === 'COMPLETED');
      title = "district_approved_applications";
    } else if (reportType === 'REJECTED') {
      dataToExport = applications.filter(a => a.workflowStatus === 'DISTRICT_REJECTED' || a.workflowStatus === 'REJECTED');
      title = "district_rejected_applications";
    } else if (reportType === 'MONTHLY_SUMMARY') {
      const currentMonth = new Date().getMonth();
      dataToExport = applications.filter(a => {
        if (!a.lastModifiedDate) return false;
        const modDate = new Date(a.lastModifiedDate);
        return modDate.getMonth() === currentMonth;
      });
      title = "district_monthly_summary";
    }

    exportApplicationsCSV(dataToExport, title);
  };

  // Recent activity logs
  const recentActivities = [...applications]
    .filter(a => a.lastModifiedDate && ['DISTRICT_APPROVED', 'DISTRICT_REJECTED', 'CORRECTION_REQUIRED', 'RE_VERIFICATION_REQUESTED'].includes(a.workflowStatus))
    .sort((a, b) => new Date(b.lastModifiedDate) - new Date(a.lastModifiedDate))
    .slice(0, 5);

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-100 py-20 shadow-sm flex flex-col items-center justify-center">
        <LoadingSpinner size="large" />
        <span className="text-xs text-slate-400 font-semibold mt-3">Loading district dashboard...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-800 md:text-3xl">District Dashboard</h1>
          <p className="text-slate-500 mt-1">Overview of district metrics, pending action alerts, and recent reviews.</p>
        </div>
        <div className="text-[11px] font-bold text-slate-500 bg-white border border-slate-200 rounded-lg px-3 py-2 flex items-center shadow-xs">
          HQ Scope: <span className="text-indigo-600 ml-1">Gandhinagar Division</span>
        </div>
      </div>

      {/* 6 Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
          <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Pending Reviews</p>
          <h3 className="mt-1 text-xl font-black text-slate-800">{countPending}</h3>
          <p className="text-[9px] font-medium text-amber-600 mt-1">Awaiting review</p>
        </div>
        <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
          <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Approved Today</p>
          <h3 className="mt-1 text-xl font-black text-slate-800">{countApprovedToday}</h3>
          <p className="text-[9px] font-medium text-emerald-600 mt-1">Forwarded today</p>
        </div>
        <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
          <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Rejected Today</p>
          <h3 className="mt-1 text-xl font-black text-slate-850">{countRejectedToday}</h3>
          <p className="text-[9px] font-medium text-rose-600 mt-1">Denied today</p>
        </div>
        <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
          <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Correction Pending</p>
          <h3 className="mt-1 text-xl font-black text-slate-800">{countCorrection}</h3>
          <p className="text-[9px] font-medium text-indigo-600 mt-1">Sent back</p>
        </div>
        <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
          <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Total Reviewed (Month)</p>
          <h3 className="mt-1 text-xl font-black text-slate-800">{getReviewedThisMonth()}</h3>
          <p className="text-[9px] font-medium text-slate-500 mt-1">Current Month</p>
        </div>
        <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
          <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Avg Review Time</p>
          <h3 className="mt-1 text-xl font-black text-slate-800">{getAverageReviewTime()}</h3>
          <p className="text-[9px] font-medium text-slate-500 mt-1">Submission to Audit</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Left column: Quick Actions and Alerts */}
        <div className="md:col-span-1 space-y-6">
          {/* Notifications Box */}
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm space-y-4">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-1.5">
              <Bell className="h-4 w-4 text-indigo-500 shrink-0" />
              <span>Workspace Notifications</span>
            </h4>
            {notifications.length === 0 ? (
              <p className="text-xs text-slate-400 font-medium">All review logs are up to date.</p>
            ) : (
              <div className="space-y-2">
                {notifications.map((alertItem) => (
                  <div key={alertItem.id} className="flex items-center space-x-2 bg-slate-50 border border-slate-100 rounded-lg p-2.5 text-xs font-semibold text-slate-705">
                    <span className={`h-2 w-2 rounded-full shrink-0 ${alertItem.type === 'danger' ? 'bg-rose-500' : 'bg-amber-500'}`} />
                    <span>{alertItem.message}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions Panel */}
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm space-y-4">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Quick Actions Workspace</h4>
            <div className="space-y-2 text-xs">
              <button onClick={() => navigate('/verification/district/reviews')} className="w-full flex items-center justify-between border border-indigo-100 hover:bg-indigo-50/50 rounded-xl p-3 font-bold text-indigo-650 transition-all font-sans cursor-pointer">
                <span>Go to Reviews Queue</span>
                <ArrowRight className="h-4 w-4" />
              </button>
              <button onClick={() => navigate('/verification/district/verification')} className="w-full flex items-center justify-between border border-slate-100 hover:bg-slate-50 rounded-xl p-3 font-bold text-slate-700 transition-all font-sans cursor-pointer">
                <span>View Verification Audit</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
            <div className="border-t border-slate-100 pt-3 space-y-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Export Reports</p>
              <div className="grid gap-2 grid-cols-2 text-[10px]">
                <button onClick={() => handleExport('PENDING')} className="border rounded bg-white hover:bg-slate-50 py-1.5 font-bold text-slate-600 cursor-pointer">Pending CSV</button>
                <button onClick={() => handleExport('APPROVED')} className="border rounded bg-white hover:bg-slate-50 py-1.5 font-bold text-slate-600 cursor-pointer">Approved CSV</button>
              </div>
            </div>
          </div>
        </div>

        {/* Right column: Recent activities logs */}
        <div className="md:col-span-2 space-y-6">
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm space-y-4">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Recent Audit Feed</h4>
            {recentActivities.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">No recent actions logged by Gandhiji HQ.</div>
            ) : (
              <div className="relative border-l border-slate-100 pl-4 space-y-4 ml-1">
                {recentActivities.map((app, idx) => (
                  <div key={idx} className="relative text-xs leading-relaxed space-y-0.5">
                    <span className={`absolute -left-6 top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white shadow-xs ${app.workflowStatus === 'DISTRICT_APPROVED' ? 'bg-emerald-500' : app.workflowStatus === 'DISTRICT_REJECTED' ? 'bg-rose-500' : 'bg-amber-500'}`} />
                    <div className="flex justify-between font-bold text-slate-850">
                      <span>{app.workflowStatus === 'DISTRICT_APPROVED' ? 'Approved application' : app.workflowStatus === 'DISTRICT_REJECTED' ? 'Rejected application' : 'Correction Requested'}</span>
                      <span className="text-[10px] text-slate-450">{app.lastModifiedDate ? new Date(app.lastModifiedDate).toLocaleDateString() : ''}</span>
                    </div>
                    <p className="text-[10px] text-slate-500 font-semibold">Case: <span className="font-bold text-indigo-650">{app.applicationNumber}</span> | Beneficiary: {app.beneficiary?.name || (app.beneficiary?.user?.firstName ? `${app.beneficiary.user.firstName} ${app.beneficiary.user.lastName || ''}`.trim() : `${app.beneficiary?.firstName || ''} ${app.beneficiary?.lastName || 'N/A'}`)}</p>
                    {app.remarks && <p className="text-slate-600 italic text-[10px] bg-slate-50 p-2 rounded mt-1 font-medium border border-slate-100/50">"{app.remarks}"</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
