// src/hooks/useDownload.ts
import { useState, useCallback } from 'react';
import { PurchaseRecord } from '@/types';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export type PresetRange = 'today' | '7days' | '30days' | 'custom' | '1day' | '1week' | '1month';
export type ExportFormat = 'xlsx' | 'pdf' | 'csv';

export const useDownload = (purchases: PurchaseRecord[]) => {
  const [datePreset, setDatePreset] = useState<PresetRange>('30days');
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [format, setFormat] = useState<ExportFormat>('xlsx');
  const [isExporting, setIsExporting] = useState(false);

  const applyPreset = useCallback((preset: PresetRange) => {
    setDatePreset(preset);
    const end = new Date();
    const start = new Date();

    if (preset === 'today' || preset === '1day') {
      // Today (start and end are same)
    } else if (preset === '7days' || preset === '1week') {
      start.setDate(end.getDate() - 7);
    } else if (preset === '30days' || preset === '1month') {
      start.setDate(end.getDate() - 30);
    }

    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  }, []);

  const isDateRangeInvalid = startDate > endDate;

  const getFilteredRecords = useCallback(() => {
    if (startDate > endDate) return [];
    return purchases.filter((p) => {
      if (!p.date) return true;
      const recordDate = p.date.split('T')[0];
      return recordDate >= startDate && recordDate <= endDate;
    });
  }, [purchases, startDate, endDate]);

  const exportData = useCallback(async () => {
    setIsExporting(true);
    const records = getFilteredRecords();

    try {
      const fileName = `PW_Materials_Statement_${startDate}_to_${endDate}`;

      const safeCurrency = (v: any) =>
        typeof v === 'number' && !isNaN(v) ? `₹${v.toLocaleString('en-IN')}` : '—';
      const safeQty = (q: any, u: any) =>
        typeof q === 'number' && !isNaN(q) ? `${q} ${u || ''}`.trim() : '—';
      const safeTaxRate = (r: any) =>
        typeof r === 'number' && !isNaN(r) ? `${r}%` : '—';

      if (format === 'xlsx') {
        const worksheetData = records.map((r, idx) => ({
          'Sl No': idx + 1,
          Date: r.date || '—',
          'SKU / SWC': r.sku || '—',
          'Material Item': r.item || 'Unspecified Item',
          Vendor: r.vendor || '—',
          Company: r.company || 'PW',
          Quantity: r.quantity !== null && r.quantity !== undefined ? `${r.quantity} ${r.unit || ''}`.trim() : '—',
          'Unit Price (₹)': typeof r.unitPrice === 'number' ? r.unitPrice : '',
          'Sub Total (₹)': typeof r.totalPrice === 'number' ? r.totalPrice : '',
          'GST Rate (%)': typeof r.gstRate === 'number' ? `${r.gstRate}%` : '—',
          'GST Amount (₹)': typeof r.gstAmount === 'number' ? r.gstAmount : '',
          'Net Total (₹)': typeof r.netAmount === 'number' ? r.netAmount : '',
          'Invoice Type': r.isGSTInvoice ? 'GST Tax Invoice' : 'Cash / Non-GST Bill',
          'AI Recognized': r.aiRecognized ? 'Yes' : 'Manual',
        }));

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(worksheetData.length > 0 ? worksheetData : [{ 'Status': 'No records for selected period' }]);
        XLSX.utils.book_append_sheet(wb, ws, 'Purchases Statement');
        XLSX.writeFile(wb, `${fileName}.xlsx`);
      } else if (format === 'csv') {
        const headers = [
          'Sl No',
          'Date',
          'SKU',
          'Item',
          'Vendor',
          'Company',
          'Quantity',
          'UnitPrice',
          'SubTotal',
          'GSTRate',
          'GSTAmount',
          'NetTotal',
          'InvoiceType',
        ];
        const rows = records.map((r, idx) => [
          idx + 1,
          r.date || '',
          r.sku || '',
          `"${String(r.item || '').replace(/"/g, '""')}"`,
          `"${String(r.vendor || '').replace(/"/g, '""')}"`,
          `"${String(r.company || 'PW').replace(/"/g, '""')}"`,
          r.quantity !== null && r.quantity !== undefined ? `"${r.quantity} ${r.unit || ''}"` : '""',
          typeof r.unitPrice === 'number' ? r.unitPrice : '',
          typeof r.totalPrice === 'number' ? r.totalPrice : '',
          typeof r.gstRate === 'number' ? `"${r.gstRate}%"` : '""',
          typeof r.gstAmount === 'number' ? r.gstAmount : '',
          typeof r.netAmount === 'number' ? r.netAmount : '',
          r.isGSTInvoice ? '"GST Tax Invoice"' : '"Non-GST Bill"',
        ]);

        const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `${fileName}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else if (format === 'pdf') {
        const doc = new jsPDF({ orientation: 'landscape' });

        // Header
        doc.setFontSize(18);
        doc.setTextColor(13, 71, 161); // PW Materials Blue
        doc.text('PW Materials - Material Purchase Statement', 14, 18);

        doc.setFontSize(10);
        doc.setTextColor(100, 116, 139);
        doc.text(
          `Statement Period: ${startDate} to ${endDate} | Generated on: ${new Date().toLocaleDateString('en-IN')}`,
          14,
          26
        );

        // Calculate Totals safely
        const totalNet = records.reduce((acc, curr) => acc + (typeof curr.netAmount === 'number' ? curr.netAmount : 0), 0);
        const totalGST = records.reduce((acc, curr) => acc + (typeof curr.gstAmount === 'number' ? curr.gstAmount : 0), 0);

        doc.text(
          `Total Purchases: ₹${totalNet.toLocaleString('en-IN')} | Total Input GST: ₹${totalGST.toLocaleString('en-IN')}`,
          14,
          32
        );

        const tableColumn = [
          '#',
          'Date',
          'SKU',
          'Material Item',
          'Vendor',
          'Qty',
          'Rate (₹)',
          'SubTotal (₹)',
          'GST (%)',
          'Net Total (₹)',
        ];

        const tableRows = records.map((r, i) => [
          i + 1,
          r.date || '—',
          r.sku || '—',
          r.item || 'Unspecified Item',
          r.vendor || '—',
          safeQty(r.quantity, r.unit),
          safeCurrency(r.unitPrice),
          safeCurrency(r.totalPrice),
          safeTaxRate(r.gstRate),
          safeCurrency(r.netAmount),
        ]);

        autoTable(doc, {
          startY: 38,
          head: [tableColumn],
          body: tableRows.length > 0 ? tableRows : [['—', '—', '—', 'No records found in selected date range', '—', '—', '—', '—', '—', '—']],
          theme: 'striped',
          headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255], fontStyle: 'bold' },
          styles: { fontSize: 9, cellPadding: 2.5 },
        });

        doc.save(`${fileName}.pdf`);
      }
    } catch (e) {
      console.error('Export error:', e);
      alert('Error generating export file. Please try again.');
    } finally {
      setIsExporting(false);
    }
  }, [getFilteredRecords, format, startDate, endDate]);

  return {
    datePreset,
    applyPreset,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    format,
    setFormat,
    isExporting,
    exportData,
    filteredCount: getFilteredRecords().length,
    isDateRangeInvalid,
  };
};
