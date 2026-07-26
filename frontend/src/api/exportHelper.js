/**
 * Standardized CSV Report Exporter for Subsidy System
 * Formats: Application Number, Beneficiary, Scheme, District, Requested Amount, Status, Verification Date, Officer Name, Remarks
 */
export const exportApplicationsCSV = (applicationsList, filenamePrefix = 'subsidy_applications_report') => {
  const headers = [
    'Application Number',
    'Beneficiary',
    'Scheme',
    'District',
    'Requested Amount',
    'Status',
    'Verification Date',
    'Officer Name',
    'Remarks'
  ];

  let rows = [];

  if (!applicationsList || applicationsList.length === 0) {
    rows.push(['No records available.', '', '', '', '', '', '', '', '']);
  } else {
    rows = applicationsList.map((a) => {
      const appNo = a.applicationNumber || 'N/A';
      const benName = a.beneficiary
        ? (a.beneficiary.name || `${a.beneficiary.firstName || ''} ${a.beneficiary.lastName || ''}`.trim())
        : 'N/A';
      const schemeName = a.scheme ? (a.scheme.name || '') : 'N/A';
      const district = a.beneficiary?.district || a.district || 'N/A';
      const reqAmount = a.requestedAmount != null ? `₹${Number(a.requestedAmount).toLocaleString('en-IN')}` : '₹0';
      const status = a.workflowStatus || 'N/A';
      const verDate = a.verifiedDate
        ? new Date(a.verifiedDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
        : (a.submittedDate ? new Date(a.submittedDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A');
      const officerName = a.assignedOfficer
        ? (typeof a.assignedOfficer === 'object'
            ? `${a.assignedOfficer.firstName || ''} ${a.assignedOfficer.lastName || ''}`.trim() || a.assignedOfficer.username
            : a.assignedOfficer)
        : 'Unassigned';
      const remarks = a.remarks ? `"${String(a.remarks).replace(/"/g, '""')}"` : 'N/A';

      return [
        `"${appNo}"`,
        `"${benName}"`,
        `"${schemeName}"`,
        `"${district}"`,
        `"${reqAmount}"`,
        `"${status}"`,
        `"${verDate}"`,
        `"${officerName}"`,
        remarks
      ];
    });
  }

  const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const link = document.createElement('a');
  link.setAttribute('href', encodeURI(csvContent));
  link.setAttribute('download', `${filenamePrefix}_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
