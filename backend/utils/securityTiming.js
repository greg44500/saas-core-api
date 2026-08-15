import { performance } from 'node:perf_hooks';


/**
 * Suspend l'exécution pendant une durée donnée.
 *
 * Cette fonction reste isolée afin que ensureMinimumDuration()
 * puisse être testée sans réellement attendre plusieurs centaines
 * de millisecondes.
 *
 * @param {number} milliseconds
 * @returns {Promise<void>}
 */
const sleep = (milliseconds) =>
    new Promise((resolve) => {
        setTimeout(resolve, milliseconds);
    });


/**
 * Garantit qu'un workflow sensible ne se termine pas avant
 * une durée minimale, avec une petite variation aléatoire.
 *
 * Objectif :
 * réduire la précision d'une attaque par analyse statistique
 * des temps de réponse.
 *
 * IMPORTANT :
 * - ce mécanisme ne fournit PAS un temps constant cryptographique ;
 * - il ne remplace PAS un traitement asynchrone durable ;
 * - il constitue une atténuation temporaire tant que l'envoi SMTP
 *   reste dans le chemin critique de forgot-password.
 *
 * @param {object} options
 * @param {number} options.startedAt Temps initial issu de performance.now().
 * @param {number} options.minimumMs Durée minimale sans jitter.
 * @param {number} [options.jitterMs=0] Variation maximale supplémentaire.
 * @param {Function} [options.now]
 * @param {Function} [options.random]
 * @param {Function} [options.wait]
 *
 * @returns {Promise<{
 *   elapsedMs: number,
 *   targetDurationMs: number,
 *   waitedMs: number
 * }>}
 */
const ensureMinimumDuration = async ({
    startedAt,
    minimumMs,
    jitterMs = 0,
    now = () => performance.now(),
    random = Math.random,
    wait = sleep,
}) => {
    /*
     * Ces valeurs sont internes au mécanisme de sécurité.
     * Une valeur négative, NaN ou infinie indiquerait une erreur
     * de programmation et doit être détectée immédiatement.
     */
    if (
        !Number.isFinite(startedAt)
        || startedAt < 0
    ) {
        throw new TypeError(
            'startedAt must be a finite positive number',
        );
    }

    if (
        !Number.isFinite(minimumMs)
        || minimumMs < 0
    ) {
        throw new TypeError(
            'minimumMs must be a finite positive number',
        );
    }

    if (
        !Number.isFinite(jitterMs)
        || jitterMs < 0
    ) {
        throw new TypeError(
            'jitterMs must be a finite positive number',
        );
    }

    /*
     * Le jitter est calculé entre 0 et jitterMs inclus.
     *
     * Il rend moins prévisible le seuil exact sans ajouter
     * arbitrairement le même délai à toutes les requêtes.
     */
    const jitter =
        jitterMs === 0
            ? 0
            : Math.floor(
                random() * (jitterMs + 1),
            );

    const targetDurationMs =
        minimumMs + jitter;

    /*
     * performance.now() est monotone : il mesure une durée écoulée
     * indépendamment des changements de l'horloge système.
     */
    const elapsedMs =
        Math.max(
            0,
            now() - startedAt,
        );

    const waitedMs =
        Math.max(
            0,
            targetDurationMs - elapsedMs,
        );

    /*
     * Si le traitement réel a déjà dépassé le seuil cible
     * (par exemple parce que SMTP a été lent), aucun délai
     * artificiel supplémentaire n'est ajouté.
     */
    if (waitedMs > 0) {
        await wait(waitedMs);
    }

    return {
        elapsedMs,
        targetDurationMs,
        waitedMs,
    };
};


export { ensureMinimumDuration };