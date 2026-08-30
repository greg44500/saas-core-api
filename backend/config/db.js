import mongoose from 'mongoose';

import { env } from './env.js';

// Protège globalement les filtres Mongoose contre certaines injections
// d'opérateurs MongoDB provenant de données non fiables.
mongoose.set('sanitizeFilter', true);

/**
 * Construit les options de connexion MongoDB dépendantes de l'environnement.
 *
 * En production, les indexes sont gérés explicitement par les migrations afin
 * d'éviter qu'une instance HTTP tente de créer ou modifier des indexes au
 * démarrage. En développement et en test, autoIndex reste actif pour conserver
 * une boucle de travail locale simple et fidèle aux schémas Mongoose.
 */
const buildMongoConnectionOptions = (nodeEnv = env.NODE_ENV) => ({
    autoIndex: nodeEnv !== 'production',
});

/**
 * Ouvre la connexion MongoDB.
 *
 * La couche de configuration ne journalise pas l'erreur du driver : elle peut
 * contenir des détails d'infrastructure ou de connexion. Le point d'entrée
 * appelant décide du message opérationnel à exposer et du code de sortie.
 */
const connectDB = async (mongoURI) => {
    await mongoose.connect(
        mongoURI,
        buildMongoConnectionOptions(),
    );
};

export {
    buildMongoConnectionOptions,
    connectDB,
};
