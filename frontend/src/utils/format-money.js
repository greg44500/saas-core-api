function formatMoneyFromMinor(amountMinor, currency, locale = 'fr-FR') {
  if (!Number.isInteger(amountMinor) || !currency) {
    return null;
  }

  const formatter = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  });
  const fractionDigits = formatter.resolvedOptions().maximumFractionDigits;
  const majorAmount = amountMinor / (10 ** fractionDigits);

  return formatter.format(majorAmount);
}

export { formatMoneyFromMinor };
