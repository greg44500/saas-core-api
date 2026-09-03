import mongoose from 'mongoose';
import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import {
    ENTITLEMENT_OVERRIDE_SOURCE,
    ENTITLEMENT_OVERRIDE_TARGET,
} from '../../constants/entitlementOverride.constants.js';
import {
    EntitlementOverride,
} from '../../modules/entitlementOverride/entitlementOverride.model.js';
import {
    resolveActiveEntitlementOverrides,
} from '../../modules/entitlementOverride/entitlementOverride.service.js';
import {
    createPlanCapabilityRegistry,
} from '../../modules/plan/planCapability.registry.js';


const createId = () => new mongoose.Types.ObjectId();

const AT = new Date('2026-09-03T12:00:00.000Z');
const WORKSPACE_ID = createId();
const ACTOR_ID = createId();

const createOverride = ({
    targetType,
    featureKey = null,
    metricKey = null,
    featureEnabled = null,
    limitValue = null,
    startsAt = new Date('2026-09-01T12:00:00.000Z'),
    endsAt = null,
    createdAt = new Date('2026-09-01T12:00:00.000Z'),
} = {}) => ({
    _id: createId(),
    targetType,
    featureKey,
    metricKey,
    featureEnabled,
    limitValue,
    source: ENTITLEMENT_OVERRIDE_SOURCE.PROMOTION,
    startsAt,
    endsAt,
    reason: 'Exception commerciale test',
    grantedBy: ACTOR_ID,
    updatedBy: null,
    createdAt,
    updatedAt: createdAt,
});

/**
 * Simule la Query Mongoose sans masquer le contrat important du service :
 * deux recherches distinctes sont réalisées, l'une pour endsAt=null et
 * l'autre pour les périodes bornées encore actives.
 */
const mockFindResults = ({
    permanent = [],
    bounded = [],
} = {}) => {
    const findSpy = vi
        .spyOn(EntitlementOverride, 'find')
        .mockImplementation((filter) => {
            const result = filter.endsAt === null
                ? permanent
                : bounded;

            const query = {
                select: vi.fn(() => query),
                lean: vi.fn(() => query),
                session: vi.fn(() => query),
                then: (resolve, reject) =>
                    Promise.resolve(result).then(resolve, reject),
            };

            return query;
        });

    return findSpy;
};

afterEach(() => {
    vi.restoreAllMocks();
});

describe('resolveActiveEntitlementOverrides', () => {
    it('résout séparément les features et limites actives', async () => {
        const featureOverride = createOverride({
            targetType: ENTITLEMENT_OVERRIDE_TARGET.FEATURE,
            featureKey: 'audit_logs',
            featureEnabled: true,
        });
        const limitOverride = createOverride({
            targetType: ENTITLEMENT_OVERRIDE_TARGET.LIMIT,
            metricKey: 'storage_bytes',
            limitValue: 20_000,
            endsAt: new Date('2026-09-10T12:00:00.000Z'),
        });

        mockFindResults({
            permanent: [featureOverride],
            bounded: [limitOverride],
        });

        const result = await resolveActiveEntitlementOverrides({
            workspaceId: WORKSPACE_ID,
            at: AT,
        });

        expect(result.at).toBe(AT);
        expect(result.features).toEqual({
            audit_logs: true,
        });
        expect(result.limits).toEqual({
            storage_bytes: 20_000,
        });
        expect(result.overrides).toHaveLength(2);
    });

    it('conserve null comme limite effective illimitée', async () => {
        mockFindResults({
            permanent: [
                createOverride({
                    targetType: ENTITLEMENT_OVERRIDE_TARGET.LIMIT,
                    metricKey: 'members',
                    limitValue: null,
                }),
            ],
        });

        const result = await resolveActiveEntitlementOverrides({
            workspaceId: WORKSPACE_ID,
            at: AT,
        });

        expect(result.limits).toEqual({
            members: null,
        });
    });

    it('utilise le démarrage le plus récent lorsque deux overrides se chevauchent', async () => {
        const older = createOverride({
            targetType: ENTITLEMENT_OVERRIDE_TARGET.FEATURE,
            featureKey: 'file_upload',
            featureEnabled: false,
            startsAt: new Date('2026-08-01T12:00:00.000Z'),
            createdAt: new Date('2026-08-01T12:00:00.000Z'),
        });
        const newer = createOverride({
            targetType: ENTITLEMENT_OVERRIDE_TARGET.FEATURE,
            featureKey: 'file_upload',
            featureEnabled: true,
            startsAt: new Date('2026-09-01T12:00:00.000Z'),
            createdAt: new Date('2026-09-01T12:00:00.000Z'),
        });

        mockFindResults({
            permanent: [older, newer],
        });

        const result = await resolveActiveEntitlementOverrides({
            workspaceId: WORKSPACE_ID,
            at: AT,
        });

        expect(result.features.file_upload).toBe(true);
        expect(result.overrides).toHaveLength(1);
        expect(result.overrides[0].id).toBe(newer._id.toString());
    });

    it('rejette une capability persistée absente du registre actif', async () => {
        mockFindResults({
            permanent: [
                createOverride({
                    targetType: ENTITLEMENT_OVERRIDE_TARGET.FEATURE,
                    featureKey: 'unknown_feature',
                    featureEnabled: true,
                }),
            ],
        });

        await expect(
            resolveActiveEntitlementOverrides({
                workspaceId: WORKSPACE_ID,
                at: AT,
            }),
        ).rejects.toThrow(
            'Unknown entitlement override feature: "unknown_feature"',
        );
    });

    it('accepte les capabilities ajoutées par un registre métier injecté', async () => {
        const registry = createPlanCapabilityRegistry({
            features: ['ai_analysis'],
            metrics: ['projects'],
        });

        mockFindResults({
            permanent: [
                createOverride({
                    targetType: ENTITLEMENT_OVERRIDE_TARGET.FEATURE,
                    featureKey: 'ai_analysis',
                    featureEnabled: true,
                }),
                createOverride({
                    targetType: ENTITLEMENT_OVERRIDE_TARGET.LIMIT,
                    metricKey: 'projects',
                    limitValue: 25,
                }),
            ],
        });

        const result = await resolveActiveEntitlementOverrides({
            workspaceId: WORKSPACE_ID,
            at: AT,
            registry,
        });

        expect(result.features.ai_analysis).toBe(true);
        expect(result.limits.projects).toBe(25);
    });

    it('construit les bornes temporelles côté requête et exclut les révoqués', async () => {
        const findSpy = mockFindResults();

        await resolveActiveEntitlementOverrides({
            workspaceId: WORKSPACE_ID,
            at: AT,
        });

        expect(findSpy).toHaveBeenCalledTimes(2);

        for (const [filter] of findSpy.mock.calls) {
            expect(filter.workspace).toBe(WORKSPACE_ID);
            expect(filter.revokedAt).toBeNull();
            expect(filter.startsAt.$lte).toBe(AT);
        }

        expect(findSpy.mock.calls[0][0].endsAt).toBeNull();
        expect(findSpy.mock.calls[1][0].endsAt.$gt).toBe(AT);
    });

    it('transmet la session MongoDB aux deux requêtes', async () => {
        const session = { id: 'session-test' };
        const queries = [];

        vi.spyOn(EntitlementOverride, 'find')
            .mockImplementation(() => {
                const query = {
                    select: vi.fn(() => query),
                    lean: vi.fn(() => query),
                    session: vi.fn(() => query),
                    then: (resolve, reject) =>
                        Promise.resolve([]).then(resolve, reject),
                };

                queries.push(query);
                return query;
            });

        await resolveActiveEntitlementOverrides({
            workspaceId: WORKSPACE_ID,
            at: AT,
            session,
        });

        expect(queries).toHaveLength(2);
        for (const query of queries) {
            expect(query.session).toHaveBeenCalledWith(session);
        }
    });

    it('refuse les paramètres internes invalides', async () => {
        await expect(
            resolveActiveEntitlementOverrides({
                workspaceId: null,
                at: AT,
            }),
        ).rejects.toThrow(
            'workspaceId is required to resolve entitlement overrides',
        );

        await expect(
            resolveActiveEntitlementOverrides({
                workspaceId: WORKSPACE_ID,
                at: new Date('invalid'),
            }),
        ).rejects.toThrow('at must be a valid Date');
    });
});
