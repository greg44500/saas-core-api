import express from 'express';
import { notFound } from './middlewares/notFound.js';
import { errorHandler } from './middlewares/errorHandler.js';
import helmet from 'helmet';
import { helmetOptions } from './config/helmet.config.js';
import cors from 'cors';
import { corsOptions } from './config/cors.config.js';
import { healthRouter } from './routes/health.routes.js';
const app = express();
app.use(helmet(helmetOptions)) 
app.use(cors(corsOptions));// Placer avant les parsers et les routes pour que ce soit traité avec Cors
app.use(express.json());

/*
 * Les futures routes seront enregistrées ici.
 *
 * Exemple futur :
 * app.use("/api/auth", authRoutes);
 */
app.use('/api/health', healthRouter);// Route pour vérifier l'état de santé de l'API
app.use(notFound);// Middleware pour gérer les routes non trouvées (404)
app.use(errorHandler);// Middleware pour gérer les erreurs
// Réduit les informations techniques exposées par l'API
// Ce réglage ne remplace pas les autres protections HTTP.
app.disable('x-powered-by');

// Pas de export.default pour permettre l'importation nommée dans server.js
export { app };