import { describe, expect, it } from 'vitest';

import {
  getSliderConfiguration,
} from '@/features/platform/components/platform-metric-limit-control';


describe('getSliderConfiguration', () => {
  it('borne le slider linéaire members au minimum opérationnel', () => {
    const configuration = getSliderConfiguration({
      metric: {
        key: 'members',
        overridePolicy: {
          control: 'linear_slider',
          min: 0,
          max: 50,
          step: 1,
          allowUnlimited: false,
        },
      },
      value: 1,
      minimumValue: 2,
    });

    expect(configuration).toMatchObject({
      sliderMin: 2,
      sliderMax: 50,
      sliderStep: 1,
      sliderValue: 2,
      rawValue: 2,
    });
  });

  it('mappe le stockage sur les paliers autorisés sans exposer une valeur libre', () => {
    const MiB = 1024 * 1024;
    const values = [0, 100 * MiB, 500 * MiB, 1024 * MiB];
    const configuration = getSliderConfiguration({
      metric: {
        key: 'storage_bytes',
        overridePolicy: {
          control: 'preset_slider',
          values,
          allowUnlimited: false,
        },
      },
      value: 500 * MiB,
      minimumValue: 100 * MiB,
    });

    expect(configuration).toMatchObject({
      sliderMin: 0,
      sliderMax: 2,
      sliderStep: 1,
      sliderValue: 1,
      rawValue: 500 * MiB,
    });
    expect(configuration.resolveRawValue(2)).toBe(1024 * MiB);
  });
});
