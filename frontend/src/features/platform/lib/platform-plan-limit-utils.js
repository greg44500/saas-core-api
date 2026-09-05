function isByteMetric(metric) {
  return metric?.presentation?.unit === 'bytes'
    || metric?.unit === 'bytes'
    || metric?.key === 'storage_bytes';
}

export { isByteMetric };
