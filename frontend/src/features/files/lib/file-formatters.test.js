import { describe, expect, it } from 'vitest';

import {
  formatFileCategory,
  formatFileDate,
  formatFileSize,
  formatFileType,
} from '@/features/files/lib/file-formatters';

describe('file formatters', () => {
  it('formate les tailles sans perdre la valeur utile', () => {
    expect(formatFileSize(512)).toBe('512 o');
    expect(formatFileSize(1024)).toBe('1 Ko');
    expect(formatFileSize(1024 * 1024)).toBe('1 Mo');
    expect(formatFileSize(-1)).toBe('—');
  });

  it('traduit uniquement les catégories Core connues', () => {
    expect(formatFileCategory('document')).toBe('Document');
    expect(formatFileCategory('image')).toBe('Image');
    expect(formatFileCategory('custom_category')).toBe('custom_category');
    expect(formatFileCategory()).toBe('Non renseignée');
  });

  it('privilégie l’extension pour le type affiché', () => {
    expect(formatFileType({ extension: 'pdf', mimeType: 'application/pdf' })).toBe('PDF');
    expect(formatFileType({ mimeType: 'image/png' })).toBe('image/png');
  });

  it('retourne un fallback sûr pour une date invalide', () => {
    expect(formatFileDate('not-a-date')).toBe('—');
    expect(formatFileDate('2026-09-02T10:00:00.000Z')).not.toBe('—');
  });
});
