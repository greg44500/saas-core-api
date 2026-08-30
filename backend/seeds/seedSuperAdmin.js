import mongoose from 'mongoose';
import { pathToFileURL } from 'node:url';
import { z } from 'zod';

import { env } from '../config/env.js';
import { connectDB } from '../config/db.js';
import { PLATFORM_ROLE } from '../constants/platformRoles.constants.js';
import { AUTH_PROVIDER } from '../constants/authProvider.constants.js';
import { User } from '../modules/users/user.model.js';
import { AuthIdentity } from '../modules/auth/authIdentity.model.js';
import { hashPassword } from '../utils/password.js';
import { normalizeEmail } from '../utils/normalizeEmail.js';


const superAdminSeedEnvSchema = z.object({
    SUPER_ADMIN_FIRST_NAME: z.string().trim().min(1),
    SUPER_ADMIN_LAST_NAME: z.string().trim().min(1),
    SUPER_ADMIN_EMAIL: z.string().trim().email(),
    SUPER_ADMIN_PASSWORD: z.string().min(12),
});


const getSuperAdminSeedConfig = () => {
    const result = superAdminSeedEnvSchema.safeParse(process.env);

    if (!result.success) {
        throw new Error(
            'Configuration du seed super-admin invalide ou incomplète.',
        );
    }

    return result.data;
};


const seedSuperAdmin = async ({
    firstName,
    lastName,
    email,
    password,
}) => {
    const emailCanonical = normalizeEmail(email);

    const existingUser = await User.findOne({
        emailCanonical,
    });

    if (existingUser) {
        if (
            existingUser.platformRole
            !== PLATFORM_ROLE.SUPER_ADMIN
        ) {
            existingUser.platformRole =
                PLATFORM_ROLE.SUPER_ADMIN;
            existingUser.updatedBy = null;
            await existingUser.save();
        }

        const existingLocalIdentity =
            await AuthIdentity.findOne({
                user: existingUser._id,
                provider: AUTH_PROVIDER.LOCAL,
            });

        if (!existingLocalIdentity) {
            throw new Error(
                'Le super-admin existe déjà mais ne possède '
                + 'pas d’identité d’authentification locale.',
            );
        }

        return {
            created: false,
            userId: existingUser._id.toString(),
        };
    }

    /*
     * Argon2id est volontairement exécuté avant la transaction :
     * le calcul est coûteux et ne doit pas prolonger inutilement
     * le verrou transactionnel MongoDB.
     */
    const passwordHash = await hashPassword(password);

    let createdUser;

    await mongoose.connection.transaction(
        async (session) => {
            const [user] = await User.create(
                [
                    {
                        firstName,
                        lastName,
                        email,
                        emailCanonical,
                        platformRole:
                            PLATFORM_ROLE.SUPER_ADMIN,

                        /*
                         * null représente ici une création système :
                         * aucun User préexistant n'est l'auteur
                         * du bootstrap initial.
                         */
                        createdBy: null,
                        updatedBy: null,
                    },
                ],
                {
                    session,
                },
            );

            await AuthIdentity.create(
                [
                    {
                        user: user._id,
                        provider:
                            AUTH_PROVIDER.LOCAL,
                        passwordHash,
                    },
                ],
                {
                    session,
                },
            );

            createdUser = user;
        },
    );

    return {
        created: true,
        userId: createdUser._id.toString(),
    };
};


/**
 * Ouvre la connexion MongoDB, valide la configuration du seed,
 * crée le super-admin puis ferme proprement la connexion.
 */
const runSeedSuperAdmin = async () => {
    const config = getSuperAdminSeedConfig();

    await connectDB(env.MONGODB_URI);

    try {
        const result = await seedSuperAdmin({
            firstName:
                config.SUPER_ADMIN_FIRST_NAME,
            lastName:
                config.SUPER_ADMIN_LAST_NAME,
            email:
                config.SUPER_ADMIN_EMAIL,
            password:
                config.SUPER_ADMIN_PASSWORD,
        });

        if (result.created) {
            console.log(
                'Compte super-admin créé.',
            );
        } else {
            console.log(
                'Compte super-admin déjà présent.',
            );
        }

        console.log(
            `User ID : ${result.userId}`,
        );
    } finally {
        await mongoose.disconnect();
    }
};


/**
 * Empêche l'exécution automatique du seed lorsqu'il est importé
 * par Vitest ou par un autre module.
 */
const isExecutedDirectly =
    process.argv[1]
    && import.meta.url
    === pathToFileURL(process.argv[1]).href;

if (isExecutedDirectly) {
    runSeedSuperAdmin().catch((error) => {
        console.error(
            'Échec de la création du super-admin :',
            { message: error.message },
        );

        process.exitCode = 1;
    });
}


export {
    getSuperAdminSeedConfig,
    runSeedSuperAdmin,
    seedSuperAdmin,
    superAdminSeedEnvSchema,
};
