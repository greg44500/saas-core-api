const normalizeHelpSearchValue = (value) => String(value ?? '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLocaleLowerCase('fr')
  .trim()
  .replace(/\s+/g, ' ');

const scoreHelpEntry = (entry, normalizedQuery) => {
  if (!normalizedQuery) {
    return 0;
  }

  const title = normalizeHelpSearchValue(entry.title);
  const summary = normalizeHelpSearchValue(entry.summary);
  const keywords = (entry.search?.keywords ?? []).map(normalizeHelpSearchValue);
  const questions = (entry.search?.questions ?? []).map(normalizeHelpSearchValue);

  if (title === normalizedQuery) return 1000;
  if (title.startsWith(normalizedQuery)) return 900;
  if (questions.some((question) => question === normalizedQuery)) return 850;
  if (questions.some((question) => question.startsWith(normalizedQuery))) return 800;
  if (title.includes(normalizedQuery)) return 700;
  if (keywords.some((keyword) => keyword === normalizedQuery)) return 650;
  if (keywords.some((keyword) => keyword.startsWith(normalizedQuery))) return 600;
  if (keywords.some((keyword) => keyword.includes(normalizedQuery))) return 550;
  if (questions.some((question) => question.includes(normalizedQuery))) return 500;
  if (summary.includes(normalizedQuery)) return 350;

  const tokens = normalizedQuery.split(' ').filter(Boolean);
  const searchableText = [title, summary, ...keywords, ...questions].join(' ');

  return tokens.length > 1 && tokens.every((token) => searchableText.includes(token))
    ? 250
    : 0;
};

const searchHelpEntries = (entries, query, limit = 5) => {
  const normalizedQuery = normalizeHelpSearchValue(query);

  if (!normalizedQuery || !Array.isArray(entries) || limit <= 0) {
    return [];
  }

  return entries
    .map((entry) => ({
      entry,
      score: scoreHelpEntry(entry, normalizedQuery),
    }))
    .filter(({ score }) => score > 0)
    .sort((left, right) =>
      right.score - left.score
      || (left.entry.order ?? 0) - (right.entry.order ?? 0)
      || left.entry.title.localeCompare(right.entry.title, 'fr'))
    .slice(0, limit)
    .map(({ entry }) => entry);
};

export {
  normalizeHelpSearchValue,
  searchHelpEntries,
};
