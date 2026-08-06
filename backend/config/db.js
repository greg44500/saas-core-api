import mongoose from 'mongoose';

// Ouvre la connexion MongoDB en utilisant l'URI de connexion depuis les variables d'environnement
const connectDB = async (mongoURI) => {
    try {
        await mongoose.connect(mongoURI); // Utilise l'URI de connexion depuis les variables d'environnement
        console.log('Connexion à MongoDB réussie');
    } catch (error) {
        console.error('Erreur de connexion à MongoDB :', error);
        process.exit(1); // Quitter le processus avec un code d'erreur pour indiquer l'échec de la connexion
    }
};

export { connectDB };