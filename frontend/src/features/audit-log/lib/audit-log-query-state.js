function parsePage(value) {
  if (!/^\d+$/.test(value ?? '')) return 1;

  const page = Number(value);
  return Number.isSafeInteger(page) && page >= 1 ? page : 1;
}

function metadataValues(items) {
  return new Set(
    (Array.isArray(items) ? items : [])
      .map((item) => item?.value)
      .filter(Boolean),
  );
}

function readAllowedValue(searchParams, key, items) {
  const value = searchParams.get(key);
  const allowedValues = metadataValues(items);

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

function readFilters(searchParams, metadata) {
  const rawFrom = searchParams.get('from') ?? '';
  const rawTo = searchParams.get('to') ?? '';
  let from = isValidDateInput(rawFrom) ? rawFrom : '';
  let to = isValidDateInput(rawTo) ? rawTo : '';

  if (from && to && from > to) {
    from = '';
    to = '';
  }

  return {
    action: readAllowedValue(searchParams, 'action', metadata?.actions),
    entityType: readAllowedValue(searchParams, 'entityType', metadata?.entityTypes),
    status: readAllowedValue(searchParams, 'status', metadata?.statuses),
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
  metadataValues,
  parsePage,
  readFilters,
  writeSearchParams,
};
