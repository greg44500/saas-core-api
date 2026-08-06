import { env } from '../config/env.js';

const corsOptions = {
    // origin: env.CLIENT_URL,
    origin(origin, callback) {
        // Vérifie si l'origine est autorisée en comparant avec la variable d'environnement CLIENT_URL
        const isAllowed = !origin || origin === env.CLIENT_URL;
        callback(null, isAllowed)
    },
    credentials: true, // Autorise l'envoi de cookies et d'informations d'identification dans les requêtes cross-origin
    // Définir les méthodes HTTP autorisées pour les requêtes cross-origin
    methods: [
        'GET',
        'HEAD',
        'POST',
        'PUT',
        'PATCH',
        'DELETE',
        'OPTIONS',
    ],
    allowedHeaders: ['Content-Type', 'Authorization'],// Définir les en-têtes autorisés pour les requêtes cross-origin
}

export { corsOptions };