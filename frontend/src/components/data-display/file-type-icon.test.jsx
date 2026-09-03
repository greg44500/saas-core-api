import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import {
  FileTypeIcon,
  resolveFileTypePresentation,
} from '@/components/data-display/file-type-icon';

describe('FileTypeIcon', () => {
  afterEach(() => cleanup());

  it('attribue des présentations catégorielles stables aux types connus', () => {
    expect(resolveFileTypePresentation({ mimeType: 'application/pdf' }).className)
      .toContain('text-red-500');
    expect(resolveFileTypePresentation({ mimeType: 'image/jpeg' }).className)
      .toContain('text-sky-500');
    expect(resolveFileTypePresentation({ mimeType: 'image/png' }).className)
      .toContain('text-emerald-500');
  });

  it('reste neutre pour un type inconnu et garde l’icône décorative', () => {
    const { container } = render(
      <FileTypeIcon mimeType="application/x-custom" />,
    );

    const icon = container.querySelector('svg');
    expect(icon).toHaveAttribute('aria-hidden', 'true');
    expect(icon).toHaveClass('text-muted-foreground');
  });
});
