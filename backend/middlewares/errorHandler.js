import { env } from '../config/env.js';

/**
 * Construit une représentation volontairement limitée d'une erreur interne.
 *
 * Un objet Error provenant d'une dépendance peut transporter des propriétés
 * arbitraires (config, réponse distante, URI, credentials, etc.). Le logger
 * global ne doit donc jamais sérialiser aveuglément l'objet reçu.
 */
const buildSafeErrorLog = (error, requestId = null) => ({
    requestId,
    name: typeof error?.name === 'string'
        ? error.name
        : 'Error',
    message: typeof error?.message === 'string'
        ? error.message
        : 'Unknown error',
    ...(env.NODE_ENV === 'development' && typeof error?.stack === 'string'
        ? { stack: error.stack }
        : {}),
});

/**
 * Middleware terminal de gestion des erreurs.
 *
 * Les erreurs opérationnelles peuvent exposer leur message contrôlé au client.
 * Les erreurs inattendues restent génériques côté HTTP et sont journalisées
 * avec un sous-ensemble explicite de propriétés seulement.
 */
const errorHandler = (error, req, res, next) => {
    const statusCode = error.statusCode ?? 500;
    const status = error.status ?? 'error';

    if (env.NODE_ENV === 'development') {
        return res.status(statusCode).json({
            status,
            message: error.message,
            stack: error.stack,
        });
    }

    if (error.isOperational) {
        return res.status(statusCode).json({
            status,
            message: error.message,
        });
    }

    console.error(
        'Unhandled application error',
        buildSafeErrorLog(
            error,
            req.context?.requestId ?? null,
        ),
    );

    return res.status(500).json({
        status: 'error',
        message: 'Une erreur interne est survenue',
    });
};

export {
    buildSafeErrorLog,
    errorHandler,
};