import mongoose from 'mongoose';
import { pathToFileURL } from 'node:url';
import { z } from 'zod';

import { connectDB } from '../config/db.js';
import { env } from '../config/env.js';

import {
    PLATFORM_ROLE,
} from '../constants/platformRoles.constants.js';
import {
    AUTH_PROVIDER,
} from '../constants/authProvider.constants.js';

import {
    AuthIdentity,
} from '../modules/authIdentities/authIdentity.model.js';
import { User } from '../modules/users/user.model.js';

import {
    canonicalizeEmail,
} from '../utils/canonicalizeEmail.js';
import { hashPassword } from '../utils/password.js';


/**
 * Configuration spécifique au bootstrap du premier super-admin.
 *
 * Ces variables ne sont volontairement pas intégrées à env.js :
 * elles sont nécessaires au seed, mais pas au fonctionnement normal
 * du serveur HTTP.
 */
const superAdminSeedEnvSchema = z.object({
    SUPER_ADMIN_EMAIL: z
        .email(
            'SUPER_ADMIN_EMAIL doit être une adresse email valide',
        ),

    SUPER_ADMIN_PASSWORD: z
        .string()
        .min(
            12,
            'SUPER_ADMIN_PASSWORD doit contenir au minimum 12 caractères',
        ),

    SUPER_ADMIN_FIRST_NAME: z
        .string()
        .trim()
        .min(
            1,
            'SUPER_ADMIN_FIRST_NAME est obligatoire',
        )
        .max(100),

    SUPER_ADMIN_LAST_NAME: z
        .string()
        .trim()
        .min(
            1,
            'SUPER_ADMIN_LAST_NAME est obligatoire',
        )
        .max(100),
});


/**
 * Lit et valide uniquement la configuration nécessaire au seed.
 *
 * La validation est exécutée au moment où le seed est réellement lancé,
 * et non lors de son import par Vitest.
 */
const getSuperAdminSeedConfig = () => {
    const validationResult =
        superAdminSeedEnvSchema.safeParse(process.env);

    if (!validationResult.success) {
        const errors = z.flattenError(
            validationResult.error,
        ).fieldErrors;

        throw new Error(
            `Configuration du seed super-admin invalide : ${JSON.stringify(errors)
            }`,
        );
    }

    return validationResult.data;
};


/**
 * Crée le premier compte super-admin de la plateforme.
 *
 * User et AuthIdentity sont persistés dans la même transaction afin
 * qu'un compte administratif partiellement initialisé ne puisse jamais
 * rester en base.
 *
 * Le seed est idempotent :
 * - un super-admin local déjà présent avec le même email est conservé ;
 * - un compte existant avec un autre rôle n'est jamais promu
 *   silencieusement.
 *
 * @param {object} input
 * @param {string} input.firstName
 * @param {string} input.lastName
 * @param {string} input.email
 * @param {string} input.password
 * @returns {Promise<{
 *     created: boolean,
 *     userId: string
 * }>}
 */
const seedSuperAdmin = async ({
    firstName,
    lastName,
    email,
    password,
}) => {
    const emailCanonical = canonicalizeEmail(email);

    const existingUser = await User.findOne({
        emailCanonical,
    });

    /*
     * Un compte existant ne doit jamais être élevé en super-admin
     * implicitement par un script de bootstrap.
     */
    if (existingUser) {
        if (
            existingUser.platformRole
            !== PLATFORM_ROLE.SUPER_ADMIN
        ) {
            throw new Error(
                'Un utilisateur existe déjà avec '
                + 'SUPER_ADMIN_EMAIL mais ne possède pas '
                + 'le rôle super_admin.',
            );
        }

        /*
         * Le seed initialise un compte d'authentification locale.
         * Un super-admin existant sans identité locale représente
         * donc une situation différente qui doit être traitée
         * explicitement, et non modifiée silencieusement.
         */
        const existingLocalIdentity =
            await AuthIdentity.exists({
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
            error,
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