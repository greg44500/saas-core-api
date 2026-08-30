import mongoose from 'mongoose';

// Protège globalement les filtres Mongoose contre certaines injections
// d'opérateurs MongoDB provenant de données non fiables.
mongoose.set('sanitizeFilter', true);

/**
 * Ouvre la connexion MongoDB.
 *
 * La couche de configuration ne journalise pas l'erreur du driver : elle peut
 * contenir des détails d'infrastructure ou de connexion. Le point d'entrée
 * appelant décide du message opérationnel à exposer et du code de sortie.
 */
const connectDB = async (mongoURI) => {
    await mongoose.connect(mongoURI);
};

export { connectDB };
