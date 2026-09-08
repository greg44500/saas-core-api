import { randomUUID } from 'node:crypto';

/**
 * Initialise le contexte technique partagé par les couches aval de la requête.
 *
 * `requestId` permet de corréler les traitements et les erreurs sans exposer de
 * donnée métier. L'adresse IP et le user-agent sont capturés une seule fois afin
 * que les services d'audit reçoivent un contexte cohérent et n'aient pas à
 * relire directement la requête HTTP.
 *
 * Ce middleware ne constitue pas une preuve d'identité : `ipAddress` et
 * `userAgent` restent des métadonnées de traçabilité. L'authentification du User
 * appartient exclusivement à `authenticate`.
 *
 * Les couches suivantes doivent lire ces informations depuis `req.context`
 * plutôt que d'inventer leur propre structure de contexte de requête.
 */
const requestContext = (req, res, next) => {
    req.context = {
        requestId: randomUUID(),
        ipAddress: req.ip,
        userAgent: req.get('user-agent') ?? null,
    };
    next()
};

export { requestContext };