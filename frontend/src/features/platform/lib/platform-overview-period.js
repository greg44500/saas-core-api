const OVERVIEW_PERIOD_PRESET = Object.freeze({
  DAYS_7: '7d',
  DAYS_30: '30d',
  DAYS_90: '90d',
  DAYS_365: '365d',
  CUSTOM: 'custom',
});

const DEFAULT_OVERVIEW_PERIOD_PRESET = OVERVIEW_PERIOD_PRESET.DAYS_30;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const PRESET_DAYS = Object.freeze({
  [OVERVIEW_PERIOD_PRESET.DAYS_7]: 7,
  [OVERVIEW_PERIOD_PRESET.DAYS_30]: 30,
  [OVERVIEW_PERIOD_PRESET.DAYS_90]: 90,
  [OVERVIEW_PERIOD_PRESET.DAYS_365]: 365,
});

const PERIOD_OPTIONS = Object.freeze([
  { value: OVERVIEW_PERIOD_PRESET.DAYS_7, label: '7 derniers jours' },
  { value: OVERVIEW_PERIOD_PRESET.DAYS_30, label: '30 derniers jours' },
  { value: OVERVIEW_PERIOD_PRESET.DAYS_90, label: '90 derniers jours' },
  { value: OVERVIEW_PERIOD_PRESET.DAYS_365, label: '12 derniers mois' },
  { value: OVERVIEW_PERIOD_PRESET.CUSTOM, label: 'Période personnalisée' },
]);

function isIsoDate(value) {
  if (!ISO_DATE_PATTERN.test(value ?? '')) return false;

  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

function readOverviewPeriod(searchParams) {
  const requestedPreset = searchParams.get('period') ?? DEFAULT_OVERVIEW_PERIOD_PRESET;

  if (requestedPreset === OVERVIEW_PERIOD_PRESET.CUSTOM) {
    const from = searchParams.get('from') ?? '';
    const to = searchParams.get('to') ?? '';

    if (isIsoDate(from) && isIsoDate(to) && from <= to) {
      return {
        preset: OVERVIEW_PERIOD_PRESET.CUSTOM,
        from,
        to,
      };
    }

    return {
      preset: DEFAULT_OVERVIEW_PERIOD_PRESET,
      from: '',
      to: '',
    };
  }

  if (Object.hasOwn(PRESET_DAYS, requestedPreset)) {
    return {
      preset: requestedPreset,
      from: '',
      to: '',
    };
  }

  return {
    preset: DEFAULT_OVERVIEW_PERIOD_PRESET,
    from: '',
    to: '',
  };
}

function writeOverviewPeriodSearchParams({ preset, from = '', to = '' }) {
  const params = new URLSearchParams();

  // Le preset 30 jours est la valeur canonique par défaut : une URL sans query
  // reste lisible tout en laissant le backend appliquer exactement la même règle.
  if (preset === DEFAULT_OVERVIEW_PERIOD_PRESET) {
    return params;
  }

  if (preset === OVERVIEW_PERIOD_PRESET.CUSTOM) {
    params.set('period', preset);
    params.set('from', from);
    params.set('to', to);
    return params;
  }

  params.set('period', preset);
  return params;
}

function resolveOverviewApiPeriod(period, now = new Date()) {
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
    throw new TypeError('now must be a valid Date');
  }

  if (period.preset === DEFAULT_OVERVIEW_PERIOD_PRESET) {
    return {};
  }

  if (period.preset === OVERVIEW_PERIOD_PRESET.CUSTOM) {
    if (!isIsoDate(period.from) || !isIsoDate(period.to) || period.from > period.to) {
      throw new TypeError('custom overview period is invalid');
    }

    const from = new Date(`${period.from}T00:00:00.000Z`);
    const toInclusive = new Date(`${period.to}T00:00:00.000Z`);
    const toExclusive = new Date(toInclusive.getTime() + 24 * 60 * 60 * 1000);

    return {
      from: from.toISOString(),
      to: toExclusive.toISOString(),
    };
  }

  const days = PRESET_DAYS[period.preset];
  if (!days) {
    throw new TypeError('overview period preset is unknown');
  }

  return {
    from: new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString(),
    to: now.toISOString(),
  };
}

function validateCustomOverviewPeriod({ from, to, maxDays = 366 }) {
  if (!isIsoDate(from) || !isIsoDate(to)) {
    return 'Sélectionnez une date de début et une date de fin valides.';
  }

  if (from > to) {
    return 'La date de début doit précéder la date de fin.';
  }

  const fromDate = new Date(`${from}T00:00:00.000Z`);
  const toExclusive = new Date(`${to}T00:00:00.000Z`).getTime()
    + 24 * 60 * 60 * 1000;
  const durationDays = (toExclusive - fromDate.getTime()) / (24 * 60 * 60 * 1000);

  if (durationDays > maxDays) {
    return `La période ne peut pas dépasser ${maxDays} jours.`;
  }

  return null;
}

export {
  DEFAULT_OVERVIEW_PERIOD_PRESET,
  OVERVIEW_PERIOD_PRESET,
  PERIOD_OPTIONS,
  isIsoDate,
  readOverviewPeriod,
  resolveOverviewApiPeriod,
  validateCustomOverviewPeriod,
  writeOverviewPeriodSearchParams,
};
