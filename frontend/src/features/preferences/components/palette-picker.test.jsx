import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { PalettePicker } from '@/features/preferences/components/palette-picker';

describe('PalettePicker', () => {
  it('présente la palette sous forme visuelle et conserve une sélection explicite', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <PalettePicker
        onChange={onChange}
        value="core"
      />,
    );

    const paletteButton = screen.getByRole('button', { name: 'Core Atlantique' });

    expect(paletteButton).toHaveAttribute('aria-pressed', 'true');
    expect(paletteButton.querySelectorAll('[style]')).toHaveLength(5);

    await user.click(paletteButton);
    expect(onChange).toHaveBeenCalledWith('core');
  });
});
