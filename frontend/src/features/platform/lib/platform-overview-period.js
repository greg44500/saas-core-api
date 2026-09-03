const OVERVIEW_PERIOD_PRESET = Object.freeze({
  DAYS_7: '7d',
  DAYS_30: '30d',
  DAYS_90: '90d',
  DAYS_365: '365d',
  CUSTOM: 'custom',
});

const DEFAULT_OVERVIEW_PERIOD_PRESET = OVERVIEW_PERIOD_PRESET.DAYS_30;
const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

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

function parseIsoDateParts(value) {
  const match = ISO_DATE_PATTERN.exec(value ?? '');
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const validationDate = new Date(Date.UTC(year, month - 1, day));

  if (
    validationDate.getUTCFullYear() !== year
    || validationDate.getUTCMonth() !== month - 1
    || validationDate.getUTCDate() !== day
  ) {
    return null;
  }

  return { year, month, day };
}

function isIsoDate(value) {
  return parseIsoDateParts(value) !== null;
}

function createLocalDayBoundary(value, dayOffset = 0) {
  const parts = parseIsoDateParts(value);
  if (!parts) return null;

  return new Date(
    parts.year,
    parts.month - 1,
    parts.day + dayOffset,
    0,
    0,
    0,
    0,
  );
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

    /*
     * Les DatePicker manipulent des jours civils locaux. On convertit donc les
     * minuits locaux en instants ISO au dernier moment, comme pour les filtres
     * Audit, afin qu'un administrateur français sélectionnant le 01/08 ne voie
     * pas sa période décalée à cause de UTC+1/UTC+2. La borne `to` reste
     * exclusive en utilisant le début local du jour suivant, ce qui absorbe
     * correctement les changements d'heure sans supposer qu'un jour vaut 24 h.
     */
    const from = createLocalDayBoundary(period.from);
    const toExclusive = createLocalDayBoundary(period.to, 1);

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

  // Le plafond porte sur des jours calendaires, pas sur leur durée réelle :
  // Date.UTC évite qu'un changement d'heure transforme 366 jours en 365,96.
  const fromParts = parseIsoDateParts(from);
  const toParts = parseIsoDateParts(to);
  const fromUtc = Date.UTC(fromParts.year, fromParts.month - 1, fromParts.day);
  const toExclusiveUtc = Date.UTC(
    toParts.year,
    toParts.month - 1,
    toParts.day + 1,
  );
  const durationDays = (toExclusiveUtc - fromUtc) / (24 * 60 * 60 * 1000);

  if (durationDays > maxDays) {
    return `La période ne peut pas dépasser ${maxDays} jours.`;
  }

  return null;
}

export {
  DEFAULT_OVERVIEW_PERIOD_PRESET,
  OVERVIEW_PERIOD_PRESET,
  PERIOD_OPTIONS,
  createLocalDayBoundary,
  isIsoDate,
  readOverviewPeriod,
  resolveOverviewApiPeriod,
  validateCustomOverviewPeriod,
  writeOverviewPeriodSearchParams,
};
