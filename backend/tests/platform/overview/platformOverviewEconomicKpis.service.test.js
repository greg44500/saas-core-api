import {
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import {
    BILLING_INTERVAL,
    BILLING_PROVIDER,
    SUBSCRIPTION_KIND,
    SUBSCRIPTION_STATUS,
    SUBSCRIPTION_TERM_TYPE,
} from '../../../constants/subscription.constants.js';
import {
    buildEffectiveEconomicAccessPipeline,
    createPlatformOverviewEconomicKpisService,
} from '../../../modules/platform/overview/platformOverviewEconomicKpis.service.js';

const AT = new Date('2026-09-10T12:00:00.000Z');

describe('platformOverviewEconomicKpis.service', () => {
    it('construit un pipeline aligné sur les règles d’entitlement runtime', () => {
        const pipeline = buildEffectiveEconomicAccessPipeline({
            at: AT,
            commercialInvitationCollectionName: 'commercialinvitations',
        });
        const match = pipeline[0].$match.$or;

        expect(match).toEqual(expect.arrayContaining([
            expect.objectContaining({
                kind: SUBSCRIPTION_KIND.COMMERCIAL,
                status: SUBSCRIPTION_STATUS.ACTIVE,
                termType: SUBSCRIPTION_TERM_TYPE.OPEN_ENDED,
                currentPeriodEnd: null,
                trialEndsAt: null,
                cancelAtPeriodEnd: false,
                billingInterval: BILLING_INTERVAL.NONE,
                priceExclTaxMinor: 0,
                provider: BILLING_PROVIDER.MANUAL,
            }),
            expect.objectContaining({
                kind: SUBSCRIPTION_KIND.COMMERCIAL,
                status: SUBSCRIPTION_STATUS.TRIALING,
            }),
            expect.objectContaining({
                kind: SUBSCRIPTION_KIND.BASELINE,
                status: SUBSCRIPTION_STATUS.ACTIVE,
            }),
        ]));

        expect(pipeline).toEqual(expect.arrayContaining([
            expect.objectContaining({
                $group: {
                    _id: '$workspace',
                    subscription: { $first: '$$ROOT' },
                },
            }),
        ]));
    });

    it('retourne des catégories économiques mutuellement exclusives', async () => {
        const SubscriptionModel = {
            aggregate: vi.fn().mockResolvedValue([
                {
                    paidActive: [{ count: 4 }],
                    freeActive: [{ count: 7 }],
                    freeViaCommercialInvitation: [{ count: 2 }],
                    activeTrials: [{ count: 3 }],
                },
            ]),
        };
        const CommercialInvitationModel = {
            collection: { name: 'commercialinvitations' },
        };
        const service = createPlatformOverviewEconomicKpisService({
            SubscriptionModel,
            CommercialInvitationModel,
        });

        await expect(service({ at: AT })).resolves.toEqual({
            paidActiveSubscriptions: 4,
            freeActiveAccesses: {
                total: 7,
                viaCommercialInvitation: 2,
            },
            activeTrials: 3,
        });
        expect(SubscriptionModel.aggregate).toHaveBeenCalledOnce();
    });

    it('renvoie zéro lorsque les facettes sont vides', async () => {
        const SubscriptionModel = {
            aggregate: vi.fn().mockResolvedValue([{}]),
        };
        const service = createPlatformOverviewEconomicKpisService({
            SubscriptionModel,
            CommercialInvitationModel: {
                collection: { name: 'commercialinvitations' },
            },
        });

        await expect(service({ at: AT })).resolves.toEqual({
            paidActiveSubscriptions: 0,
            freeActiveAccesses: {
                total: 0,
                viaCommercialInvitation: 0,
            },
            activeTrials: 0,
        });
    });
});
