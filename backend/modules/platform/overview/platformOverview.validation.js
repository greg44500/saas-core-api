import { z } from 'zod';

const MAX_OVERVIEW_PERIOD_DAYS = 366;
const MAX_OVERVIEW_PERIOD_MS =
    MAX_OVERVIEW_PERIOD_DAYS * 24 * 60 * 60 * 1000;

/**
 * Valide la période d'analyse du dashboard Platform.
 *
 * Les deux bornes sont optionnelles ensemble afin que le service puisse
 * appliquer sa période par défaut de 30 jours. Lorsqu'une période explicite
 * est fournie, elle doit rester bornée : un dashboard interactif ne doit pas
 * déclencher accidentellement des agrégations illimitées sur tout l'historique.
 */
const platformOverviewQuerySchema = z
    .strictObject({
        from: z.coerce.date().optional(),
        to: z.coerce.date().optional(),
    })
    .superRefine((data, ctx) => {
        const hasFrom = data.from !== undefined;
        const hasTo = data.to !== undefined;

        if (hasFrom !== hasTo) {
            ctx.addIssue({
                code: 'custom',
                message:
                    'Les paramètres from et to doivent être fournis ensemble.',
            });
            return;
        }

        if (!hasFrom) {
            return;
        }

        if (data.to <= data.from) {
            ctx.addIssue({
                code: 'custom',
                path: ['to'],
                message:
                    'La fin de période doit être postérieure au début.',
            });
            return;
        }

        if (data.to.getTime() - data.from.getTime() > MAX_OVERVIEW_PERIOD_MS) {
            ctx.addIssue({
                code: 'custom',
                path: ['to'],
                message:
                    `La période d'analyse ne peut pas dépasser ${MAX_OVERVIEW_PERIOD_DAYS} jours.`,
            });
        }
    });

export {
    MAX_OVERVIEW_PERIOD_DAYS,
    platformOverviewQuerySchema,
};
