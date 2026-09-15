import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { FilesTable } from '@/features/files/components/files-table';

const file = {
  id: 'file-1',
  originalName: 'contrat.pdf',
  mimeType: 'application/pdf',
  sizeBytes: 2048,
  category: 'document',
  createdAt: '2026-09-02T10:00:00.000Z',
};

describe('FilesTable', () => {
  it('expose une action de prévisualisation distincte du téléchargement', async () => {
    const user = userEvent.setup();
    const onPreview = vi.fn();
    const onDownload = vi.fn();

    render(
      <FilesTable
        canDelete={false}
        downloadingFileId={null}
        files={[file]}
        onDelete={vi.fn()}
        onDownload={onDownload}
        onPreview={onPreview}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Visualiser contrat.pdf' }));

    expect(onPreview).toHaveBeenCalledWith(file);
    expect(onDownload).not.toHaveBeenCalled();
    expect(
      screen.getByRole('button', { name: 'Télécharger contrat.pdf' }),
    ).toBeInTheDocument();
  });
});
