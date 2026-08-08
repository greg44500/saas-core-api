import {
    argon2,
    randomBytes,
    timingSafeEqual,
} from 'node:crypto';

/**
 * Paramètres Argon2id utilisés pour la V1.
 *
 * Ils sont centralisés ici afin :
 * - d'éviter des valeurs dispersées dans le code ;
 * - de pouvoir faire évoluer la politique de hashage plus tard ;
 * - de conserver des paramètres cohérents entre création et vérification.
 */
const ARGON2_CONFIG = Object.freeze({
    memory: 19 * 1024,
    passes: 2,
    parallelism: 1,
    tagLength: 32,
    saltLength: 16,
});

/**
 * Version interne du format de stockage.
 *
 * La version permet de faire évoluer ultérieurement les paramètres
 * ou l'algorithme sans rendre les anciens passwordHash illisibles.
 */
const PASSWORD_HASH_VERSION = 'v1';

const PASSWORD_HASH_ALGORITHM = 'argon2id';

/**
 * Encapsule l'API callback de node:crypto dans une Promise.
 *
 * Le reste de l'application peut ainsi utiliser async/await
 * sans dépendre directement de l'implémentation de crypto.argon2().
 */
const deriveKey = ({
    password,
    salt,
    memory,
    passes,
    parallelism,
    tagLength,
}) =>
    new Promise((resolve, reject) => {
        argon2(
            PASSWORD_HASH_ALGORITHM,
            {
                message: password,
                nonce: salt,
                memory,
                passes,
                parallelism,
                tagLength,
            },
            (error, derivedKey) => {
                if (error) {
                    reject(error);
                    return;
                }

                resolve(derivedKey);
            },
        );
    });

/**
 * Transforme un mot de passe brut en représentation persistable.
 *
 * Un nouveau salt aléatoire est généré à chaque hash afin que
 * deux mots de passe identiques ne produisent pas la même valeur stockée.
 *
 * La chaîne retournée contient également les paramètres nécessaires
 * pour pouvoir vérifier le mot de passe ultérieurement.
 *
 * @param {string} password Mot de passe brut validé en amont.
 * @returns {Promise<string>} Représentation Argon2id à stocker dans passwordHash.
 */
export const hashPassword = async (password) => {
    const salt = randomBytes(ARGON2_CONFIG.saltLength);

    const derivedKey = await deriveKey({
        password,
        salt,
        memory: ARGON2_CONFIG.memory,
        passes: ARGON2_CONFIG.passes,
        parallelism: ARGON2_CONFIG.parallelism,
        tagLength: ARGON2_CONFIG.tagLength,
    });

    const parameters = [
        `m=${ARGON2_CONFIG.memory}`,
        `t=${ARGON2_CONFIG.passes}`,
        `p=${ARGON2_CONFIG.parallelism}`,
        `l=${ARGON2_CONFIG.tagLength}`,
    ].join(',');

    /*
     * Le salt n'est pas un secret.
     * Il est stocké avec le hash afin de pouvoir reproduire exactement
     * la dérivation lors d'une tentative de connexion.
     */
    return [
        PASSWORD_HASH_VERSION,
        PASSWORD_HASH_ALGORITHM,
        parameters,
        salt.toString('base64url'),
        derivedKey.toString('base64url'),
    ].join('$');
};

/**
 * Vérifie qu'un mot de passe brut correspond à un passwordHash existant.
 *
 * Les paramètres sont lus depuis la valeur persistée afin de conserver
 * suffisamment d'informations pour faire évoluer le format dans le futur.
 *
 * @param {string} password Mot de passe brut fourni lors de l'authentification.
 * @param {string} storedPasswordHash Valeur stockée dans AuthIdentity.passwordHash.
 * @returns {Promise<boolean>} true si le mot de passe correspond.
 */
export const verifyPassword = async (
    password,
    storedPasswordHash,
) => {
    const [
        version,
        algorithm,
        parameters,
        encodedSalt,
        encodedHash,
    ] = storedPasswordHash.split('$');

    /*
     * Une valeur utilisant une version ou un algorithme inconnu
     * ne doit pas être interprétée avec les règles actuelles.
     */
    if (
        version !== PASSWORD_HASH_VERSION ||
        algorithm !== PASSWORD_HASH_ALGORITHM
    ) {
        return false;
    }

    const parsedParameters = Object.fromEntries(
        parameters.split(',').map((parameter) => {
            const [key, value] = parameter.split('=');

            return [key, Number(value)];
        }),
    );

    /*
     * La V1 n'autorise que les paramètres que nous avons explicitement validés.
     *
     * Cela évite notamment qu'une valeur corrompue ou manipulée demande
     * à Argon2 une quantité de mémoire ou de calcul incontrôlée.
     *
     * Lorsqu'une V2 sera réellement nécessaire, elle sera ajoutée explicitement.
     */
    const supportedParameters =
        parsedParameters.m === ARGON2_CONFIG.memory &&
        parsedParameters.t === ARGON2_CONFIG.passes &&
        parsedParameters.p === ARGON2_CONFIG.parallelism &&
        parsedParameters.l === ARGON2_CONFIG.tagLength;

    if (!supportedParameters) {
        return false;
    }

    const salt = Buffer.from(encodedSalt, 'base64url');
    const expectedHash = Buffer.from(encodedHash, 'base64url');

    const derivedKey = await deriveKey({
        password,
        salt,
        memory: parsedParameters.m,
        passes: parsedParameters.t,
        parallelism: parsedParameters.p,
        tagLength: parsedParameters.l,
    });

    /*
     * timingSafeEqual exige des buffers de même longueur.
     * Cette vérification évite donc une exception avant la comparaison.
     */
    if (derivedKey.length !== expectedHash.length) {
        return false;
    }

    /*
     * On évite une comparaison classique avec === pour une donnée sensible.
     * timingSafeEqual limite les différences de temps liées au contenu comparé.
     */
    return timingSafeEqual(derivedKey, expectedHash);
};