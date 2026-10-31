// src/pages/MaterialsPage.tsx
//
// Page 2: Materials
// Dedicated Materials page displaying all saved materials, newest first,
// with table and mobile card views, photo previews, editing, deleting, and manual entry.
//

import React from 'react';
import { Material } from '@/types';
import { MaterialsTable } from '@/components/MaterialsList/MaterialsTable';

interface MaterialsPageProps {
  materials: Material[];
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onUpdateField: (id: string, field: any, value: any) => void;
  onOpenAdd: () => void;
}

export const MaterialsPage: React.FC<MaterialsPageProps> = ({
  materials,
  onDelete,
  onDuplicate,
  onUpdateField,
  onOpenAdd,
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
      <MaterialsTable
        materials={materials}
        onDelete={onDelete}
        onDuplicate={onDuplicate}
        onUpdateField={onUpdateField}
        onOpenAdd={onOpenAdd}
      />
    </div>
  );
};
