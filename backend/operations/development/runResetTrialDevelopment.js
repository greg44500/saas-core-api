import mongoose from 'mongoose';

import { connectDB } from '../../config/db.js';
import { env } from '../../config/env.js';
import {
    resetDevelopmentTrial,
} from './resetTrialDevelopment.service.js';

const readArgument = (name) => {
    const inlinePrefix = `--${name}=`;
    const inline = process.argv.find((argument) =>
        argument.startsWith(inlinePrefix));

    if (inline) {
        return inline.slice(inlinePrefix.length).trim();
    }

    const index = process.argv.indexOf(`--${name}`);
    return index >= 0 ? process.argv[index + 1]?.trim() : null;
};

const hasFlag = (name) => process.argv.includes(`--${name}`);

/**
 * Ce runner est volontairement séparé de l'API HTTP. Rejouer un trial en
 * développement doit rester une opération explicite de maintenance et ne doit
 * jamais créer une route susceptible d'être exposée en production.
 */
const run = async () => {
    if (env.NODE_ENV !== 'development') {
        throw new Error(
            'Cette commande refuse tout environnement autre que development.',
        );
    }

    const email = readArgument('email');
    const workspaceId = readArgument('workspace-id');
    const confirmed = hasFlag('confirm-development-reset');

    if (!email || !workspaceId) {
        throw new Error(
            'Usage: npm run dev:reset-trial -- --email=<email> --workspace-id=<id> --confirm-development-reset',
        );
    }

    await connectDB(env.MONGODB_URI);

    const result = await resetDevelopmentTrial({
        email,
        workspaceId,
        confirmed,
    });

    console.info('Trial de développement réinitialisé.', result);
};

run()
    .catch((error) => {
        console.error(
            'Échec de la réinitialisation du trial de développement:',
            error?.message ?? 'Erreur inconnue',
        );
        process.exitCode = 1;
    })
    .finally(async () => {
        await mongoose.disconnect();
    });
