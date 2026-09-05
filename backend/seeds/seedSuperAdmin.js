import mongoose from 'mongoose';
import { pathToFileURL } from 'node:url';
import { z } from 'zod';

import { connectDB } from '../config/db.js';
import { env } from '../config/env.js';

import {
    PLATFORM_ROLE,
} from '../constants/platformRoles.constants.js';
import {
    PLATFORM_ROLE_STATUS,
    PLATFORM_TEAM_MEMBER_STATUS,
    PLATFORM_TEAM_ROLE_KEY,
} from '../constants/platformTeam.constants.js';
import {
    AUTH_PROVIDER,
} from '../constants/authProvider.constants.js';

import {
    AuthIdentity,
} from '../modules/authIdentities/authIdentity.model.js';
import {
    PlatformRole,
} from '../modules/platformRole/platformRole.model.js';
import {
    PlatformTeamMember,
} from '../modules/platformTeam/platformTeamMember.model.js';
import { User } from '../modules/users/user.model.js';

import {
    canonicalizeEmail,
} from '../utils/canonicalizeEmail.js';
import { hashPassword } from '../utils/password.js';
import {
    passwordSchema,
} from '../shared/validation/password.validation.js';
import {
    seedPlatformRoles,
} from './seedPlatformRoles.js';


const ACTIVE_FOUNDER_STATUSES = Object.freeze([
    PLATFORM_TEAM_MEMBER_STATUS.ACTIVE,
    PLATFORM_TEAM_MEMBER_STATUS.SUSPENDED,
]);

/**
 * Configuration spécifique au bootstrap du Fondateur / premier super-admin.
 * Ces variables restent propres au seed et ne sont pas nécessaires au serveur
 * HTTP en fonctionnement normal.
 */
const superAdminSeedEnvSchema = z.object({
    SUPER_ADMIN_EMAIL: z.email(
        'SUPER_ADMIN_EMAIL doit être une adresse email valide',
    ),
    SUPER_ADMIN_PASSWORD: passwordSchema,
    SUPER_ADMIN_FIRST_NAME: z
        .string()
        .trim()
        .min(1, 'SUPER_ADMIN_FIRST_NAME est obligatoire')
        .max(100),
    SUPER_ADMIN_LAST_NAME: z
        .string()
        .trim()
        .min(1, 'SUPER_ADMIN_LAST_NAME est obligatoire')
        .max(100),
});


const getSuperAdminSeedConfig = () => {
    const validationResult =
        superAdminSeedEnvSchema.safeParse(process.env);

    if (!validationResult.success) {
        const errors = z.flattenError(
            validationResult.error,
        ).fieldErrors;

        throw new Error(
            `Configuration du seed super-admin invalide : ${JSON.stringify(errors)}`,
        );
    }

    return validationResult.data;
};


const ensureFounderMembership = async ({
    user,
    session,
}) => {
    const superAdminRole = await PlatformRole.findOne({
        key: PLATFORM_TEAM_ROLE_KEY.SUPER_ADMIN,
        status: PLATFORM_ROLE_STATUS.ACTIVE,
    }).session(session);

    if (!superAdminRole) {
        throw new Error(
            'Le rôle système Super administrateur doit être installé avant le bootstrap du Fondateur.',
        );
    }

    const founder = await PlatformTeamMember.findOne({
        isFounder: true,
        status: mongoose.trusted({
            $in: ACTIVE_FOUNDER_STATUSES,
        }),
    }).session(session);

    if (founder) {
        if (!founder.user.equals(user._id)) {
            throw new Error(
                'Un autre Fondateur est déjà enregistré pour cette instance.',
            );
        }

        if (
            founder.status !== PLATFORM_TEAM_MEMBER_STATUS.ACTIVE
            || !founder.role.equals(superAdminRole._id)
        ) {
            throw new Error(
                'Le membership du Fondateur existe mais son état ou son rôle est incohérent.',
            );
        }

        return {
            created: false,
            membershipId: founder._id.toString(),
        };
    }

    const anyMembership = await PlatformTeamMember.findOne({
        user: user._id,
    }).session(session);

    if (anyMembership) {
        throw new Error(
            'Le compte de bootstrap possède déjà un historique PlatformTeamMember sans qualité de Fondateur. Une récupération explicite est requise.',
        );
    }

    const [membership] = await PlatformTeamMember.create(
        [
            {
                user: user._id,
                role: superAdminRole._id,
                status: PLATFORM_TEAM_MEMBER_STATUS.ACTIVE,
                isFounder: true,
                joinedAt: new Date(),
                createdBy: user._id,
                updatedBy: user._id,
            },
        ],
        { session },
    );

    return {
        created: true,
        membershipId: membership._id.toString(),
    };
};


/**
 * Crée ou vérifie le compte Fondateur initial.
 *
 * Le seed n'élève jamais silencieusement un User ordinaire. L'adresse du
 * bootstrap est fournie explicitement par SUPER_ADMIN_EMAIL et la qualité de
 * Fondateur est persistée dans PlatformTeamMember, jamais déduite ensuite de
 * l'email ou de l'ancienneté du compte.
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

    if (existingUser) {
        if (
            existingUser.platformRole
            !== PLATFORM_ROLE.SUPER_ADMIN
        ) {
            throw new Error(
                'Un utilisateur existe déjà avec SUPER_ADMIN_EMAIL mais ne possède pas le rôle super_admin.',
            );
        }

        const existingLocalIdentity =
            await AuthIdentity.exists({
                user: existingUser._id,
                provider: AUTH_PROVIDER.LOCAL,
            });

        if (!existingLocalIdentity) {
            throw new Error(
                'Le super-admin existe déjà mais ne possède pas d’identité d’authentification locale.',
            );
        }

        let founderResult;
        await mongoose.connection.transaction(async (session) => {
            founderResult = await ensureFounderMembership({
                user: existingUser,
                session,
            });
        });

        return {
            created: false,
            userId: existingUser._id.toString(),
            founderMembershipCreated: founderResult.created,
            founderMembershipId: founderResult.membershipId,
        };
    }

    const passwordValidation = passwordSchema.safeParse(password);
    if (!passwordValidation.success) {
        throw new Error(
            'Le mot de passe du Fondateur ne respecte pas la politique de sécurité du Core.',
        );
    }

    const passwordHash = await hashPassword(password);

    let createdUser;
    let founderResult;

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
                        createdBy: null,
                        updatedBy: null,
                    },
                ],
                { session },
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
                { session },
            );

            founderResult = await ensureFounderMembership({
                user,
                session,
            });

            createdUser = user;
        },
    );

    return {
        created: true,
        userId: createdUser._id.toString(),
        founderMembershipCreated: founderResult.created,
        founderMembershipId: founderResult.membershipId,
    };
};


const runSeedSuperAdmin = async () => {
    const config = getSuperAdminSeedConfig();

    await connectDB(env.MONGODB_URI);

    try {
        /**
         * Le rôle Super administrateur doit exister avant le membership du
         * Fondateur. Le seed des rôles est idempotent et ne touche pas aux rôles
         * personnalisés.
         */
        await seedPlatformRoles();

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

        console.log(
            result.created
                ? 'Compte Fondateur / super-admin créé.'
                : 'Compte Fondateur / super-admin déjà présent.',
        );
        console.log(`User ID : ${result.userId}`);
        console.log(
            `Founder membership ID : ${result.founderMembershipId}`,
        );
    } finally {
        await mongoose.disconnect();
    }
};


const isExecutedDirectly =
    process.argv[1]
    && import.meta.url
    === pathToFileURL(process.argv[1]).href;

if (isExecutedDirectly) {
    runSeedSuperAdmin().catch((error) => {
        console.error(
            'Échec de la création du Fondateur / super-admin :',
            { message: error.message },
        );

        process.exitCode = 1;
    });
}


export {
    ensureFounderMembership,
    getSuperAdminSeedConfig,
    runSeedSuperAdmin,
    seedSuperAdmin,
    superAdminSeedEnvSchema,
};
