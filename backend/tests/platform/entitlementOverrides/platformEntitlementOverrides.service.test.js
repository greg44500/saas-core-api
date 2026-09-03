import mongoose from 'mongoose';
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import {
    AUDIT_ACTION,
    AUDIT_ENTITY_TYPE,
    AUDIT_STATUS,
} from '../../../constants/auditActions.constants.js';
import {
    ENTITLEMENT_OVERRIDE_SOURCE,
    ENTITLEMENT_OVERRIDE_TARGET,
} from '../../../constants/entitlementOverride.constants.js';
import {
    createAuditLog,
} from '../../../modules/auditLog/auditLog.service.js';
import {
    EntitlementOverride,
} from '../../../modules/entitlementOverride/entitlementOverride.model.js';
import {
    createPlatformEntitlementOverride,
    listPlatformEntitlementOverrides,
    revokePlatformEntitlementOverride,
    updatePlatformEntitlementOverride,
} from '../../../modules/platform/entitlementOverrides/platformEntitlementOverrides.service.js';
import { Workspace } from '../../../modules/workspace/workspace.model.js';
import {
    createPlanCapabilityRegistry,
} from '../../../modules/plan/planCapability.registry.js';

vi.mock(
    '../../../modules/auditLog/auditLog.service.js',
    () => ({
        createAuditLog: vi.fn(),
    }),
);


const createId = () => new mongoose.Types.ObjectId();
const NOW = new Date('2026-09-03T12:00:00.000Z');

const buildWorkspaceQuery = (result) => {
    const query = {
        select: vi.fn(() => query),
        session: vi.fn().mockResolvedValue(result),
    };

    return query;
};

const buildSessionQuery = (result) => ({
    session: vi.fn().mockResolvedValue(result),
});

const buildReadQuery = (result) => {
    const query = {
        select: vi.fn(() => query),
        populate: vi.fn(() => query),
        lean: vi.fn().mockResolvedValue(result),
    };

    return query;
};

const buildListQuery = (result) => {
    const query = {
        select: vi.fn(() => query),
        populate: vi.fn(() => query),
        sort: vi.fn(() => query),
        skip: vi.fn(() => query),
        limit: vi.fn(() => query),
        lean: vi.fn().mockResolvedValue(result),
    };

    return query;
};

const createOverrideDocument = ({
    workspaceId = createId(),
    actorId = createId(),
    featureEnabled = true,
    endsAt = null,
    revokedAt = null,
} = {}) => ({
    _id: createId(),
    workspace: workspaceId,
    targetType: ENTITLEMENT_OVERRIDE_TARGET.FEATURE,
    featureKey: 'file_upload',
    metricKey: null,
    featureEnabled,
    limitValue: null,
    source: ENTITLEMENT_OVERRIDE_SOURCE.SUPPORT,
    startsAt: new Date('2026-09-01T12:00:00.000Z'),
    endsAt,
    reason: 'Accès temporaire support',
    grantedBy: actorId,
    updatedBy: null,
    revokedAt,
    revokedBy: null,
    revokeReason: null,
    createdAt: new Date('2026-09-01T10:00:00.000Z'),
    updatedAt: new Date('2026-09-01T10:00:00.000Z'),
    save: vi.fn().mockResolvedValue(undefined),
});

const toReadDocument = (override) => ({
    ...override,
    workspace: {
        _id: override.workspace,
        name: 'Workspace test',
    },
    grantedBy: {
        _id: override.grantedBy,
        firstName: 'Admin',
        lastName: 'Platform',
        email: 'admin@example.test',
    },
    updatedBy: override.updatedBy
        ? { _id: override.updatedBy }
        : null,
    revokedBy: override.revokedBy
        ? { _id: override.revokedBy }
        : null,
});


describe('platformEntitlementOverrides.service', () => {
    let session;

    beforeEach(() => {
        session = { id: 'mongo-session' };

        vi.spyOn(mongoose.connection, 'transaction')
            .mockImplementation(async (callback) => callback(session));

        createAuditLog.mockResolvedValue(undefined);
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.clearAllMocks();
    });

    it('crée et audite un override dans la même transaction', async () => {
        const workspaceId = createId();
        const actorId = createId();
        const createdOverride = createOverrideDocument({
            workspaceId,
            actorId,
        });

        vi.spyOn(Workspace, 'findById')
            .mockReturnValue(buildWorkspaceQuery({
                _id: workspaceId,
            }));
        const createSpy = vi.spyOn(EntitlementOverride, 'create')
            .mockResolvedValue([createdOverride]);
        vi.spyOn(EntitlementOverride, 'findById')
            .mockReturnValue(buildReadQuery(
                toReadDocument(createdOverride),
            ));

        const result = await createPlatformEntitlementOverride({
            overrideData: {
                workspaceId: workspaceId.toString(),
                targetType: ENTITLEMENT_OVERRIDE_TARGET.FEATURE,
                featureKey: 'file_upload',
                featureEnabled: true,
                source: ENTITLEMENT_OVERRIDE_SOURCE.SUPPORT,
                reason: 'Accès temporaire support',
            },
            actorId,
            now: NOW,
            ipAddress: '127.0.0.1',
            userAgent: 'Vitest',
        });

        expect(createSpy).toHaveBeenCalledWith(
            [expect.objectContaining({
                workspace: workspaceId,
                featureKey: 'file_upload',
                featureEnabled: true,
                startsAt: NOW,
                grantedBy: actorId,
            })],
            { session },
        );

        expect(createAuditLog).toHaveBeenCalledWith(
            expect.objectContaining({
                actor: actorId,
                workspace: workspaceId,
                action: AUDIT_ACTION.ENTITLEMENT_OVERRIDE_CREATED,
                entityType: AUDIT_ENTITY_TYPE.ENTITLEMENT_OVERRIDE,
                entityId: createdOverride._id,
                status: AUDIT_STATUS.SUCCESS,
            }),
            { session },
        );

        expect(result.lifecycle).toBe('active');
    });

    it('refuse une capability inconnue avant toute transaction', async () => {
        const registry = createPlanCapabilityRegistry();
        const transactionSpy = mongoose.connection.transaction;

        await expect(createPlatformEntitlementOverride({
            overrideData: {
                workspaceId: createId().toString(),
                targetType: ENTITLEMENT_OVERRIDE_TARGET.FEATURE,
                featureKey: 'unknown_feature',
                featureEnabled: true,
                source: ENTITLEMENT_OVERRIDE_SOURCE.SUPPORT,
                reason: 'Test capability inconnue',
            },
            actorId: createId(),
            registry,
            now: NOW,
        })).rejects.toMatchObject({
            statusCode: 400,
        });

        expect(transactionSpy).not.toHaveBeenCalled();
    });

    it('modifie une feature active et audite previous/next', async () => {
        const actorId = createId();
        const override = createOverrideDocument();
        const readback = toReadDocument({
            ...override,
            featureEnabled: false,
            reason: 'Restriction temporaire',
            updatedBy: actorId,
        });

        vi.spyOn(EntitlementOverride, 'findById')
            .mockReturnValueOnce(buildSessionQuery(override))
            .mockReturnValueOnce(buildReadQuery(readback));

        const result = await updatePlatformEntitlementOverride({
            overrideId: override._id,
            overrideData: {
                featureEnabled: false,
                reason: 'Restriction temporaire',
            },
            actorId,
            now: NOW,
        });

        expect(override.save).toHaveBeenCalledWith({ session });
        expect(override.featureEnabled).toBe(false);
        expect(override.updatedBy).toBe(actorId);
        expect(createAuditLog).toHaveBeenCalledWith(
            expect.objectContaining({
                action: AUDIT_ACTION.ENTITLEMENT_OVERRIDE_UPDATED,
                metadata: expect.objectContaining({
                    previous: expect.objectContaining({
                        featureEnabled: true,
                    }),
                    next: expect.objectContaining({
                        featureEnabled: false,
                    }),
                }),
            }),
            { session },
        );
        expect(result.featureEnabled).toBe(false);
    });

    it('refuse de réécrire un override expiré', async () => {
        const override = createOverrideDocument({
            endsAt: new Date('2026-09-02T12:00:00.000Z'),
        });

        vi.spyOn(EntitlementOverride, 'findById')
            .mockReturnValue(buildSessionQuery(override));

        await expect(updatePlatformEntitlementOverride({
            overrideId: override._id,
            overrideData: {
                reason: 'Tentative de réécriture',
            },
            actorId: createId(),
            now: NOW,
        })).rejects.toMatchObject({
            statusCode: 409,
        });

        expect(override.save).not.toHaveBeenCalled();
        expect(createAuditLog).not.toHaveBeenCalled();
    });

    it('révoque avec auteur, motif et audit atomiques', async () => {
        const actorId = createId();
        const override = createOverrideDocument();
        const readback = toReadDocument({
            ...override,
            revokedAt: NOW,
            revokedBy: actorId,
            revokeReason: 'Fin anticipée',
            updatedBy: actorId,
        });

        vi.spyOn(EntitlementOverride, 'findById')
            .mockReturnValueOnce(buildSessionQuery(override))
            .mockReturnValueOnce(buildReadQuery(readback));

        const result = await revokePlatformEntitlementOverride({
            overrideId: override._id,
            reason: 'Fin anticipée',
            actorId,
            now: NOW,
        });

        expect(override.revokedAt).toBe(NOW);
        expect(override.revokedBy).toBe(actorId);
        expect(override.revokeReason).toBe('Fin anticipée');
        expect(override.save).toHaveBeenCalledWith({ session });
        expect(createAuditLog).toHaveBeenCalledWith(
            expect.objectContaining({
                action: AUDIT_ACTION.ENTITLEMENT_OVERRIDE_REVOKED,
                entityType: AUDIT_ENTITY_TYPE.ENTITLEMENT_OVERRIDE,
            }),
            { session },
        );
        expect(result.lifecycle).toBe('revoked');
    });

    it('liste avec pagination et filtre workspace', async () => {
        const workspaceId = createId();
        const override = createOverrideDocument({ workspaceId });
        const findSpy = vi.spyOn(EntitlementOverride, 'find')
            .mockReturnValue(buildListQuery([
                toReadDocument(override),
            ]));
        vi.spyOn(EntitlementOverride, 'countDocuments')
            .mockResolvedValue(1);

        const result = await listPlatformEntitlementOverrides({
            page: 2,
            limit: 10,
            workspaceId: workspaceId.toString(),
            at: NOW,
        });

        expect(findSpy).toHaveBeenCalledWith({
            workspace: workspaceId.toString(),
        });
        expect(result.pagination).toEqual({
            page: 2,
            limit: 10,
            total: 1,
            totalPages: 1,
        });
        expect(result.overrides[0].workspace.id)
            .toBe(workspaceId.toString());
    });
});
