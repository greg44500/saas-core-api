import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { PalettePicker } from '@/features/preferences/components/palette-picker';

describe('PalettePicker', () => {
  it('présente quatre palettes visuelles compactes avec une sélection explicite', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <PalettePicker
        onChange={onChange}
        value="core"
      />,
    );

    const paletteButtons = [
      screen.getByRole('button', { name: 'Core Atlantique' }),
      screen.getByRole('button', { name: 'Refreshing Summer Fun' }),
      screen.getByRole('button', { name: 'Leafy Green Garden' }),
      screen.getByRole('button', { name: 'Golden Peachy Glow' }),
    ];

    expect(paletteButtons).toHaveLength(4);
    paletteButtons.forEach((button) => {
      expect(button.querySelectorAll('[style]')).toHaveLength(5);
    });
    expect(paletteButtons[0]).toHaveAttribute('aria-pressed', 'true');

    await user.click(paletteButtons[2]);
    expect(onChange).toHaveBeenCalledWith('leafy-green-garden');
  });
});
