import mongoose from 'mongoose';
import {
    describe,
    expect,
    it,
} from 'vitest';

import {
    PLAN_SYSTEM_ROLE,
} from '../../constants/plan.constants.js';

import {
    serializePlan,
    serializeSubscription,
    serializeWorkspaceEffectiveEntitlement,
} from '../../modules/subscriptions/services/getWorkspaceSubscriptionOverview.service.js';

const { ObjectId } = mongoose.Types;

const buildPlan = (overrides = {}) => ({
    _id: new ObjectId(),
    key: 'pro',
    systemRole: null,
    name: 'Pro',
    features: ['file_upload', 'export_pdf'],
    limits: new Map([
        ['members', 10],
        ['storage_bytes', 1024],
    ]),
    currency: 'EUR',
    priceMonthlyExclTaxMinor: 2900,
    ...overrides,
});

describe('workspace subscription overview projection', () => {
    it('n’expose que les capacités non financières du plan', () => {
        const result = serializePlan(buildPlan());

        expect(result).toEqual({
            id: expect.any(String),
            isBaseline: false,
            name: 'Pro',
            features: ['file_upload', 'export_pdf'],
            limits: {
                members: 10,
                storage_bytes: 1024,
            },
        });

        expect(result).not.toHaveProperty('key');
        expect(result).not.toHaveProperty('systemRole');
        expect(result).not.toHaveProperty('currency');
        expect(result).not.toHaveProperty('priceMonthlyExclTaxMinor');
        expect(result).not.toHaveProperty('priceYearlyExclTaxMinor');
    });

    it('identifie la baseline sans exposer son rôle système', () => {
        const result = serializePlan(buildPlan({
            key: 'legacy-reference',
            systemRole: PLAN_SYSTEM_ROLE.BASELINE,
            name: 'Découverte',
        }));

        expect(result).toMatchObject({
            isBaseline: true,
            name: 'Découverte',
        });
        expect(result).not.toHaveProperty('key');
        expect(result).not.toHaveProperty('systemRole');
    });

    it('n’expose aucune donnée de paiement ou de provider depuis Subscription', () => {
        const plan = buildPlan();
        const targetPlan = buildPlan();
        const subscription = {
            _id: new ObjectId(),
            kind: 'commercial',
            status: 'active',
            plan,
            currentPeriodStart: new Date('2026-08-01T00:00:00.000Z'),
            currentPeriodEnd: new Date('2026-09-01T00:00:00.000Z'),
            trialEndsAt: null,
            cancelAtPeriodEnd: false,
            billingInterval: 'monthly',
            currency: 'EUR',
            priceExclTaxMinor: 2900,
            provider: 'stripe',
            providerCustomerId: 'cus_secret',
            providerSubscriptionId: 'sub_secret',
            discountType: 'percent',
            discountValue: 20,
            scheduledChange: {
                type: 'downgrade',
                targetPlan,
                targetBillingInterval: 'monthly',
                targetCurrency: 'EUR',
                targetPriceExclTaxMinor: 1900,
                effectiveAt: new Date('2026-09-01T00:00:00.000Z'),
                requestedAt: new Date('2026-08-20T00:00:00.000Z'),
                requestedBy: new ObjectId(),
            },
        };

        const result = serializeSubscription(subscription);

        expect(result.status).toBe('active');
        expect(result.plan.isBaseline).toBe(false);
        expect(result.scheduledChange.targetPlan.isBaseline).toBe(false);
        expect(result.scheduledChange.targetBillingInterval).toBe('monthly');
        expect(result.plan).not.toHaveProperty('key');
        expect(result.scheduledChange.targetPlan).not.toHaveProperty('key');

        expect(result).not.toHaveProperty('currency');
        expect(result).not.toHaveProperty('priceExclTaxMinor');
        expect(result).not.toHaveProperty('provider');
        expect(result).not.toHaveProperty('providerCustomerId');
        expect(result).not.toHaveProperty('providerSubscriptionId');
        expect(result).not.toHaveProperty('discountType');
        expect(result).not.toHaveProperty('discountValue');
        expect(result.scheduledChange).not.toHaveProperty('targetCurrency');
        expect(result.scheduledChange).not.toHaveProperty(
            'targetPriceExclTaxMinor',
        );
        expect(result.scheduledChange).not.toHaveProperty('requestedBy');
    });

    it('expose les capabilities effectives sans révéler les overrides Platform', () => {
        const access = {
            subscription: {
                kind: 'commercial',
                status: 'active',
            },
            plan: buildPlan(),
            effectiveCapabilities: {
                features: [
                    'file_upload',
                    'team_management',
                ],
                limits: {
                    members: 25,
                    storage_bytes: null,
                },
                appliedOverrides: [
                    {
                        id: new ObjectId().toString(),
                        source: 'commercial_gesture',
                        reason: 'Geste commercial interne',
                        grantedBy: new ObjectId(),
                    },
                ],
            },
            accessMode: 'normal',
            reason: null,
            blockingLimits: [],
            nonBlockingLimits: [],
        };

        const result =
            serializeWorkspaceEffectiveEntitlement(access);

        expect(result).toEqual({
            plan: expect.objectContaining({
                id: expect.any(String),
                isBaseline: false,
                name: 'Pro',
            }),
            features: [
                'file_upload',
                'team_management',
            ],
            limits: {
                members: 25,
                storage_bytes: null,
            },
            subscriptionKind: 'commercial',
            subscriptionStatus: 'active',
            accessMode: 'normal',
            reason: null,
            blockingLimits: [],
            nonBlockingLimits: [],
        });

        expect(result.plan).not.toHaveProperty('key');
        expect(result).not.toHaveProperty('appliedOverrides');
        expect(JSON.stringify(result)).not.toContain(
            'commercial_gesture',
        );
        expect(JSON.stringify(result)).not.toContain(
            'Geste commercial interne',
        );
    });

    it('refuse un entitlement effectif incomplet au lieu de fabriquer des droits', () => {
        expect(() => {
            serializeWorkspaceEffectiveEntitlement({
                subscription: {
                    kind: 'baseline',
                    status: 'active',
                },
                plan: buildPlan(),
                effectiveCapabilities: {
                    features: null,
                    limits: {},
                },
                accessMode: 'normal',
                reason: null,
                blockingLimits: [],
                nonBlockingLimits: [],
            });
        }).toThrow(
            'Workspace effective entitlement is incomplete.',
        );
    });
});