import { app } from './app.js';
import { connectDB } from './config/db.js';
import { env } from './config/env.js';

// Fonction pour démarrer le serveur après la connexion à MongoDB
const startServer = async () => {
    try {
        await connectDB(env.MONGODB_URI);
        // Démarrer le serveur Express après la connexion réussie à MongoDB
        app.listen(env.PORT, () => {
            console.log(`Serveur démarré sur le port ${env.PORT}.`);
        });
    } catch (error) {
        console.error(
            'Impossible de démarrer le serveur : connexion à MongoDB échouée.',
            error.message,
        );

        process.exit(1);
    }
};

startServer();
