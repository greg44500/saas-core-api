import { z } from 'zod';

/**
 * Valide uniquement la structure HTTP d'un mot de passe.
 *
 * Cette primitive est partagée par les modules qui doivent confirmer ou
 * définir un mot de passe. Elle reste indépendante des modules Auth et User
 * afin d'éviter les dépendances circulaires entre leurs validations.
 *
 * Le mot de passe n'est volontairement pas trimé : les espaces peuvent faire
 * partie du secret choisi par l'utilisateur.
 */
const passwordSchema = z.string().min(15).max(128);

export { passwordSchema };
