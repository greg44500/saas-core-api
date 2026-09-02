import { afterEach, describe, expect, it, vi } from 'vitest';

import { downloadBlob } from '@/features/files/lib/download-blob';

const originalCreateObjectURL = URL.createObjectURL;
const originalRevokeObjectURL = URL.revokeObjectURL;

function restoreUrlMethod(name, originalValue) {
  if (originalValue) {
    Object.defineProperty(URL, name, {
      configurable: true,
      value: originalValue,
    });
    return;
  }

  delete URL[name];
}

describe('downloadBlob', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    restoreUrlMethod('createObjectURL', originalCreateObjectURL);
    restoreUrlMethod('revokeObjectURL', originalRevokeObjectURL);
  });

  it('crée puis libère une URL temporaire de téléchargement', () => {
    const blob = new Blob(['content'], { type: 'application/pdf' });
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const createObjectURL = vi.fn(() => 'blob:test-url');
    const revokeObjectURL = vi.fn();

    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: createObjectURL,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: revokeObjectURL,
    });

    downloadBlob(blob, 'contrat.pdf');

    expect(createObjectURL).toHaveBeenCalledWith(blob);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:test-url');
    expect(document.querySelector('a[download="contrat.pdf"]')).not.toBeInTheDocument();
  });
});
