import {
  AUDIT_ACTION_OPTIONS,
  AUDIT_ENTITY_TYPE_OPTIONS,
  AUDIT_STATUS_OPTIONS,
} from '@/features/audit-log/lib/audit-log-presentation';

const auditActionValues = new Set(AUDIT_ACTION_OPTIONS.map(([value]) => value));
const auditEntityTypeValues = new Set(AUDIT_ENTITY_TYPE_OPTIONS.map(([value]) => value));
const auditStatusValues = new Set(AUDIT_STATUS_OPTIONS.map(([value]) => value));

function parsePage(value) {
  if (!/^\d+$/.test(value ?? '')) return 1;

  const page = Number(value);
  return Number.isSafeInteger(page) && page >= 1 ? page : 1;
}

function readAllowedValue(searchParams, key, allowedValues) {
  const value = searchParams.get(key);
  return value && allowedValues.has(value) ? value : '';
}

function isValidDateInput(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value ?? '')) return false;

  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day
  );
}

function readFilters(searchParams) {
  const rawFrom = searchParams.get('from') ?? '';
  const rawTo = searchParams.get('to') ?? '';
  let from = isValidDateInput(rawFrom) ? rawFrom : '';
  let to = isValidDateInput(rawTo) ? rawTo : '';

  if (from && to && from > to) {
    from = '';
    to = '';
  }

  return {
    action: readAllowedValue(searchParams, 'action', auditActionValues),
    entityType: readAllowedValue(searchParams, 'entityType', auditEntityTypeValues),
    status: readAllowedValue(searchParams, 'status', auditStatusValues),
    from,
    to,
  };
}

function writeSearchParams(filters, page = 1) {
  const next = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value) next.set(key, value);
  });

  if (page > 1) next.set('page', String(page));
  return next;
}

export {
  isValidDateInput,
  parsePage,
  readFilters,
  writeSearchParams,
};
