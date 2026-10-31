// src/pages/ExportPage.tsx
//
// Page 3: Export
// Dedicated Export Statements page with date filters, statement summaries,
// and export options (Excel .xlsx, PDF statement, and CSV data).
//

import React from 'react';
import { PurchaseRecord } from '@/types';
import { DownloadSection } from '@/components/DownloadSection/DownloadSection';

interface ExportPageProps {
  purchases: PurchaseRecord[];
}

export const ExportPage: React.FC<ExportPageProps> = ({ purchases }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
      <DownloadSection purchases={purchases} />
    </div>
  );
};
