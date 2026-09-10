import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Textarea } from '@/components/ui/textarea';

describe('Textarea', () => {
  it('déclare le français et active la correction orthographique par défaut', () => {
    render(<Textarea aria-label="Description" />);

    const textarea = screen.getByRole('textbox', { name: 'Description' });
    expect(textarea).toHaveAttribute('lang', 'fr-FR');
    expect(textarea).toHaveAttribute('spellcheck', 'true');
  });

  it('permet à un écran spécialisé de surcharger la langue et spellcheck', () => {
    render(
      <Textarea
        aria-label="Code"
        lang="en"
        spellCheck={false}
      />,
    );

    const textarea = screen.getByRole('textbox', { name: 'Code' });
    expect(textarea).toHaveAttribute('lang', 'en');
    expect(textarea).toHaveAttribute('spellcheck', 'false');
  });
});
