const DEFAULT_DATA_PAGE_SIZE = 10;
const DATA_PAGE_SIZE_OPTIONS = Object.freeze([10, 20, 50, 100]);

function parseDataPageSize(value) {
  const pageSize = Number(value);
  return DATA_PAGE_SIZE_OPTIONS.includes(pageSize)
    ? pageSize
    : DEFAULT_DATA_PAGE_SIZE;
}

export {
  DATA_PAGE_SIZE_OPTIONS,
  DEFAULT_DATA_PAGE_SIZE,
  parseDataPageSize,
};
