import { describe, expect, it } from 'vitest';

import { validateFileUpload } from '@/features/files/validation/file-upload-schema';

describe('file upload validation', () => {
  it('accepte un fichier PDF avec une catégorie connue', () => {
    const file = new File(['pdf'], 'contrat.pdf', { type: 'application/pdf' });

    const result = validateFileUpload({ file, category: 'document' });

    expect(result.success).toBe(true);
  });

  it('refuse une catégorie inconnue', () => {
    const file = new File(['pdf'], 'contrat.pdf', { type: 'application/pdf' });

    const result = validateFileUpload({ file, category: 'unknown' });

    expect(result.success).toBe(false);
  });

  it('refuse un type déclaré hors périmètre', () => {
    const file = new File(['text'], 'notes.txt', { type: 'text/plain' });

    const result = validateFileUpload({ file, category: 'document' });

    expect(result.success).toBe(false);
    expect(result.error.issues[0].message).toBe(
      'Seuls les fichiers PDF, JPG et PNG sont acceptés.',
    );
  });

  it('refuse l’absence de fichier', () => {
    const result = validateFileUpload({ file: null, category: 'other' });

    expect(result.success).toBe(false);
  });
});
