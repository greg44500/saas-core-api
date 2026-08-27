import { z } from 'zod';

import {
    PLAN_STATUS,
} from '../../../constants/plan.constants.js';


/**
 * Les clés fonctionnelles d'un plan sont destinées à rester stables.
 *
 * Le format autorise les variantes nécessaires à un catalogue évolutif
 * tout en empêchant les espaces, caractères spéciaux ou clés ambiguës.
 */
const PLAN_KEY_PATTERN = /^[a-z][a-z0-9_-]*$/;

/**
 * Les features et métriques utilisent volontairement une convention
 * plus stricte afin de rester cohérentes avec le registre de capabilities.
 */
const PLAN_CAPABILITY_KEY_PATTERN =
    /^[a-z][a-z0-9_]*$/;


/**
 * Représente une limite quantitative configurable sur un plan.
 *
 * Convention métier :
 * - null = limite explicitement illimitée ;
 * - 0 = aucune consommation autorisée ;
 * - entier positif = plafond de consommation.
 */
const planLimitValueSchema = z.union([
    z
        .number()
        .int(
            'Une limite de plan doit être un entier',
        )
        .nonnegative(
            'Une limite de plan doit être positive ou nulle',
        ),
    z.null(),
]);


/**
 * Valide la création administrative d'un plan.
 *
 * Le schéma contrôle uniquement le contrat HTTP et la structure des données.
 * L'existence réelle des features et métriques reste contrôlée par
 * `validatePlanCapabilities()` dans le module Plan.
 *
 * `strictObject` empêche l'enregistrement silencieux de propriétés inconnues
 * provenant d'une erreur frontend ou d'un client API mal configuré.
 */
const createPlatformPlanBodySchema = z.strictObject({
    key: z
        .string()
        .trim()
        .min(
            2,
            'key doit contenir au minimum 2 caractères',
        )
        .max(
            64,
            'key ne peut pas dépasser 64 caractères',
        )
        .regex(
            PLAN_KEY_PATTERN,
            'Le format de key est invalide',
        ),

    name: z
        .string()
        .trim()
        .min(
            2,
            'name doit contenir au minimum 2 caractères',
        )
        .max(
            120,
            'name ne peut pas dépasser 120 caractères',
        ),

    description: z
        .string()
        .trim()
        .max(
            1000,
            'description ne peut pas dépasser 1000 caractères',
        )
        .nullable()
        .optional(),

    status: z
        .enum(
            Object.values(PLAN_STATUS),
        )
        .optional(),

    isPublic: z
        .boolean()
        .optional(),

    displayOrder: z
        .number()
        .int(
            'displayOrder doit être un entier',
        )
        .nonnegative(
            'displayOrder doit être positif ou nul',
        )
        .optional(),

    currency: z
        .string()
        .trim()
        .length(
            3,
            'currency doit contenir exactement 3 caractères',
        )
        .regex(
            /^[A-Za-z]{3}$/,
            'Le format de currency est invalide',
        )
        .transform(
            (value) => value.toUpperCase(),
        ),

    priceMonthlyExclTaxMinor: z
        .number()
        .int(
            'priceMonthlyExclTaxMinor doit être un entier',
        )
        .nonnegative(
            'priceMonthlyExclTaxMinor doit être positif ou nul',
        ),

    priceYearlyExclTaxMinor: z
        .number()
        .int(
            'priceYearlyExclTaxMinor doit être un entier',
        )
        .nonnegative(
            'priceYearlyExclTaxMinor doit être positif ou nul',
        ),

    features: z
        .array(
            z
                .string()
                .trim()
                .regex(
                    PLAN_CAPABILITY_KEY_PATTERN,
                    'Le format d’une feature est invalide',
                ),
        )
        .refine(
            (features) =>
                new Set(features).size
                === features.length,
            {
                message:
                    'Les features ne doivent pas contenir de doublons',
            },
        )
        .optional(),

    limits: z
        .record(
            z
                .string()
                .regex(
                    PLAN_CAPABILITY_KEY_PATTERN,
                    'Le format d’une clé de limite est invalide',
                ),
            planLimitValueSchema,
        )
        .optional(),
});


export {
    createPlatformPlanBodySchema,
};