/**
 * Ajoute un nombre entier de jours à une date.
 *
 * La fonction retourne une nouvelle Date et ne modifie jamais
 * l'objet Date fourni en argument.
 *
 * @param {Date} date Date de départ.
 * @param {number} days Nombre de jours à ajouter.
 * @returns {Date} Nouvelle date calculée.
 */
export const addDays = (date, days) => {
  return new Date(
    date.getTime() + days * 24 * 60 * 60 * 1000
  );
};

/**
 * Ajoute un nombre entier de minutes à une date.
 *
 * La fonction retourne une nouvelle Date et ne modifie jamais
 * l'objet Date fourni en argument.
 *
 * @param {Date} date Date de départ.
 * @param {number} minutes Nombre de minutes à ajouter.
 * @returns {Date} Nouvelle date calculée.
 */
export const addMinutes = (
  date,
  minutes,
) => {
  return new Date(
    date.getTime()
    + minutes * 60 * 1000,
  );
};