function isInitialQueryLoading(query) {
  return query.isLoading || (query.isFetching && query.data === undefined);
}

export { isInitialQueryLoading };
