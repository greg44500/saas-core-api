import { env } from "../config/env.js";
// Middleware pour gérer les erreurs
const errorHandler = (error, req, res, next) => {
    // Définit le code d'état HTTP et le message d'erreur par défaut si l'erreur n'est pas opérationnelle
    const statusCode = error.statusCode ?? 500;
    const status = error.status ?? 'error';
    // Si l'environnement est en développement, on renvoie la pile d'appels pour faciliter le débogage
    if (env.NODE_ENV === 'development') {
        return res.status(statusCode).json({
            status,
            message: error.message,
            stack: error.stack,
        });
    }
    // Si l'erreur est opérationnelle, on renvoie le message d'erreur au client
    if (error.isOperational) {
        return res.status(statusCode).json({
            status,
            message: error.message,
        });
    }
    // Si l'erreur n'est pas opérationnelle, on renvoie un message d'erreur générique au client et on log l'erreur pour le débogage
    console.error(error);
    return res.status(500).json({
        status: 'error',
        message: 'Une erreur interne est survenue',
    });
}
export { errorHandler };