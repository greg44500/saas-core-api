import mongoose from 'mongoose';
import { pathToFileURL } from 'node:url';

import { connectDB } from '../config/db.js';
import { env } from '../config/env.js';
import {
    PLATFORM_ROLE_STATUS,
} from '../constants/platformTeam.constants.js';
import {
    PlatformRole,
} from '../modules/platformRole/platformRole.model.js';
import {
    SYSTEM_PLATFORM_ROLE_PRESETS,
} from '../modules/platformRole/platformRole.presets.js';


/**
 * Synchronise uniquement les rôles système fournis par le Core.
 *
 * Les rôles personnalisés ne sont jamais modifiés par ce seed. Un rôle système
 * peut en revanche recevoir une définition mise à jour lors d'une évolution du
 * Core afin que son preset reste cohérent avec le contrat courant.
 */
const seedPlatformRoles = async () => {
    const result = {
        created: [],
        updated: [],
    };

    for (const preset of SYSTEM_PLATFORM_ROLE_PRESETS) {
        const existingRole = await PlatformRole.findOne({
            key: preset.key,
        });

        if (existingRole && existingRole.isSystem !== true) {
            throw new Error(
                `La clé PlatformRole réservée ${preset.key} est déjà utilisée par un rôle personnalisé.`,
            );
        }

        const update = {
            name: preset.name,
            description: preset.description,
            permissions: [...preset.permissions],
            status: PLATFORM_ROLE_STATUS.ACTIVE,
            archivedAt: null,
            archivedBy: null,
        };

        if (existingRole) {
            await PlatformRole.updateOne(
                { _id: existingRole._id },
                { $set: update },
                { runValidators: true },
            );
            result.updated.push(preset.name);
            continue;
        }

        await PlatformRole.create({
            key: preset.key,
            ...update,
            isSystem: true,
        });
        result.created.push(preset.name);
    }

    return result;
};

const runSeedPlatformRoles = async () => {
    await connectDB(env.MONGODB_URI);

    try {
        const result = await seedPlatformRoles();

        console.log(
            `Rôles Plateforme créés : ${result.created.length}`,
        );
        console.log(
            `Rôles Plateforme synchronisés : ${result.updated.length}`,
        );
    } finally {
        await mongoose.disconnect();
    }
};

const isExecutedDirectly =
    process.argv[1]
    && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isExecutedDirectly) {
    runSeedPlatformRoles().catch((error) => {
        console.error(
            'Échec de la synchronisation des rôles de la Plateforme :',
            { message: error.message },
        );
        process.exitCode = 1;
    });
}

export {
    runSeedPlatformRoles,
    seedPlatformRoles,
};
