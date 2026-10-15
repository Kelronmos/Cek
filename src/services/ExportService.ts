import { type CEKEntry } from './AdvancedCEK';

export const exportToCSV = (history: CEKEntry[], startDate?: string, endDate?: string) => {
  let filteredHistory = history;

  if (startDate || endDate) {
    filteredHistory = history.filter(entry => {
      const entryDate = new Date(entry.timestamp);
      if (startDate && entryDate < new Date(startDate)) return false;
      if (endDate && entryDate > new Date(endDate)) return false;
      return true;
    });
  }

  if (filteredHistory.length === 0) {
    alert('No data found for the selected date range.');
    return;
  }

  const headers = [
    'Timestamp',
    'Status',
    'Drift',
    'Sentiment',
    'Dim_1 (Truth)',
    'Dim_2 (Safety)',
    'Dim_3 (Utility)',
    'Dim_4 (Ethics)',
    'Dim_5 (Intent)',
    'Input_Text'
  ];

  const rows = filteredHistory.map(entry => [
    entry.timestamp,
    entry.status,
    entry.drift.toFixed(4),
    entry.sentiment ? entry.sentiment.score.toFixed(4) : '0.0000',
    entry.vector[0].toFixed(4),
    entry.vector[1].toFixed(4),
    entry.vector[2].toFixed(4),
    entry.vector[3].toFixed(4),
    entry.vector[4].toFixed(4),
    `"${entry.text.replace(/"/g, '""')}"`
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `cek_export_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
