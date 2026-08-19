import { app } from "./app.js";

import {
    connectDB,
} from "./config/db.js";

import {
    env,
} from "./config/env.js";

import {
    temporaryFileMaintenanceService,
} from "./services/storage/temporaryFileMaintenance.service.js";


/**
 * Démarre l'API uniquement après l'initialisation de ses dépendances.
 *
 * MongoDB est une dépendance indispensable : son indisponibilité empêche le
 * démarrage. La purge des temporaires est différente : elle améliore la
 * résilience du stockage, mais une erreur ponctuelle de maintenance ne doit
 * pas rendre toute l'API indisponible.
 */
const startServer = async () => {
    try {
        await connectDB(env.MONGODB_URI);

        /*
         * L'orchestrateur absorbe et journalise lui-même les erreurs de purge.
         * L'attente garantit toutefois que le nettoyage commencé au démarrage
         * se termine avant que l'API accepte de nouveaux uploads.
         */
        await temporaryFileMaintenanceService
            .runStartupCleanup();

        app.listen(env.PORT, () => {
            console.log(
                `Serveur démarré sur le port ${env.PORT}.`,
            );
        });
    } catch (error) {
        /*
         * À ce stade, l'erreur provient d'une dépendance indispensable au
         * démarrage, actuellement la connexion MongoDB.
         */
        console.error(
            "Impossible de démarrer le serveur : connexion à MongoDB échouée.",
            error.message,
        );

        process.exit(1);
    }
};


startServer();