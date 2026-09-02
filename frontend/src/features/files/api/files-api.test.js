import { describe, expect, it } from 'vitest';

import { createFileUploadFormData } from '@/features/files/api/files-api';

describe('createFileUploadFormData', () => {
  it('construit le payload multipart attendu sans sérialiser le fichier', () => {
    const file = new File(['pdf'], 'contrat.pdf', { type: 'application/pdf' });

    const body = createFileUploadFormData({ file, category: 'document' });

    expect(body).toBeInstanceOf(FormData);
    expect(body.get('file')).toBe(file);
    expect(body.get('category')).toBe('document');
  });
});
