function getBalancedSixColumnGridClass() {
  return 'grid grid-cols-6 gap-4';
}

/**
 * Répartit les éléments visibles sur une grille de six colonnes afin d'éviter
 * les dernières lignes orphelines. La règle dépend uniquement du nombre rendu,
 * donc elle reste valable après filtrage par permissions ou préférences.
 */
function getBalancedSixColumnItemClass(index, itemCount) {
  const position = index + 1;
  const isLast = position === itemCount;
  const baseClass = 'col-span-6';
  const smallScreenClass = itemCount > 1 && !(itemCount % 2 === 1 && isLast)
    ? 'sm:col-span-3'
    : 'sm:col-span-6';

  if (itemCount <= 1) {
    return `${baseClass} sm:col-span-6 xl:col-span-6`;
  }

  if (itemCount === 2 || itemCount === 4) {
    return `${baseClass} ${smallScreenClass} xl:col-span-3`;
  }

  const remainder = itemCount % 3;
  const balancedTailSize = remainder === 1 ? 4 : remainder;
  const firstBalancedTailIndex = itemCount - balancedTailSize;
  const xlClass = remainder === 0 || index < firstBalancedTailIndex
    ? 'xl:col-span-2'
    : 'xl:col-span-3';

  return `${baseClass} ${smallScreenClass} ${xlClass}`;
}

export {
  getBalancedSixColumnGridClass,
  getBalancedSixColumnItemClass,
};
