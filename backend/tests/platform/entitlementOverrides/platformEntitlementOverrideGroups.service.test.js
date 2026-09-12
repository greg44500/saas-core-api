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
    createPlatformFeatureOverrideGroup,
    revokePlatformFeatureOverrideGroup,
    updatePlatformFeatureOverrideGroup,
} from '../../../modules/platform/entitlementOverrides/platformEntitlementOverrideGroups.service.js';
import {
    revokePlatformEntitlementOverride,
    updatePlatformEntitlementOverride,
} from '../../../modules/platform/entitlementOverrides/platformEntitlementOverrides.service.js';
import { Workspace } from '../../../modules/workspace/workspace.model.js';

vi.mock(
    '../../../modules/auditLog/auditLog.service.js',
    () => ({
        createAuditLog: vi.fn(),
    }),
);


const createId = () => new mongoose.Types.ObjectId();
const NOW = new Date('2026-09-12T10:00:00.000Z');

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

const createOverrideDocument = ({
    workspaceId = createId(),
    actorId = createId(),
    groupId = createId(),
    targetType = ENTITLEMENT_OVERRIDE_TARGET.FEATURE,
    featureKey = 'file_upload',
    metricKey = null,
    featureEnabled = true,
    limitValue = null,
    startsAt = new Date('2026-09-10T10:00:00.000Z'),
    endsAt = null,
} = {}) => ({
    _id: createId(),
    workspace: workspaceId,
    groupId,
    groupName: 'Offre support temporaire',
    targetType,
    featureKey,
    metricKey,
    featureEnabled,
    limitValue,
    source: ENTITLEMENT_OVERRIDE_SOURCE.SUPPORT,
    startsAt,
    endsAt,
    reason: 'Accès commercial exceptionnel',
    grantedBy: actorId,
    updatedBy: null,
    revokedAt: null,
    revokedBy: null,
    revokeReason: null,
    createdAt: new Date('2026-09-10T09:00:00.000Z'),
    updatedAt: new Date('2026-09-10T09:00:00.000Z'),
    save: vi.fn().mockResolvedValue(undefined),
});

const createLimitDocument = ({
    workspaceId,
    actorId,
    groupId,
    metricKey = 'storage_bytes',
    limitValue = 25_000_000,
} = {}) => createOverrideDocument({
    workspaceId,
    actorId,
    groupId,
    targetType: ENTITLEMENT_OVERRIDE_TARGET.LIMIT,
    featureKey: null,
    metricKey,
    featureEnabled: null,
    limitValue,
});


describe('platformEntitlementOverrideGroups.service', () => {
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

    it('crée la feature et ses limites sous un même groupId transactionnel', async () => {
        const workspaceId = createId();
        const actorId = createId();

        vi.spyOn(Workspace, 'findById')
            .mockReturnValue(buildWorkspaceQuery({ _id: workspaceId }));

        const createSpy = vi.spyOn(EntitlementOverride, 'create')
            .mockImplementation(async (documents, options) => {
                expect(options).toEqual({ session, ordered: true });

                return documents.map((document) => ({
                    ...document,
                    _id: createId(),
                    revokedAt: null,
                    revokedBy: null,
                    revokeReason: null,
                    createdAt: NOW,
                    updatedAt: NOW,
                }));
            });

        const result = await createPlatformFeatureOverrideGroup({
            groupData: {
                workspaceId: workspaceId.toString(),
                groupName: 'Offre support temporaire',
                featureKey: 'file_upload',
                featureEnabled: true,
                relatedLimits: [
                    {
                        metricKey: 'storage_bytes',
                        limitValue: 25_000_000,
                    },
                ],
                source: ENTITLEMENT_OVERRIDE_SOURCE.SUPPORT,
                reason: 'Accès commercial exceptionnel',
            },
            actorId,
            now: NOW,
        });

        const createdDocuments = createSpy.mock.calls[0][0];
        expect(createdDocuments).toHaveLength(2);
        expect(createdDocuments[0].groupId.toString())
            .toBe(createdDocuments[1].groupId.toString());
        expect(createdDocuments[0].targetType)
            .toBe(ENTITLEMENT_OVERRIDE_TARGET.FEATURE);
        expect(createdDocuments[1]).toMatchObject({
            targetType: ENTITLEMENT_OVERRIDE_TARGET.LIMIT,
            metricKey: 'storage_bytes',
            limitValue: 25_000_000,
        });
        expect(createAuditLog).toHaveBeenCalledTimes(2);
        expect(result.relatedOverrides).toHaveLength(1);
    });

    it('traite relatedLimits comme un patch partiel et conserve une limite omise', async () => {
        const actorId = createId();
        const workspaceId = createId();
        const groupId = createId();
        const primary = createOverrideDocument({
            workspaceId,
            actorId,
            groupId,
        });
        const limit = createLimitDocument({
            workspaceId,
            actorId,
            groupId,
            limitValue: 25_000_000,
        });

        vi.spyOn(EntitlementOverride, 'findById')
            .mockReturnValue(buildSessionQuery(primary));
        vi.spyOn(EntitlementOverride, 'find')
            .mockReturnValue(buildSessionQuery([limit]));

        const result = await updatePlatformFeatureOverrideGroup({
            overrideId: primary._id,
            groupData: {
                reason: 'Motif commercial ajusté',
            },
            actorId,
            now: NOW,
        });

        expect(limit.limitValue).toBe(25_000_000);
        expect(primary.reason).toBe('Motif commercial ajusté');
        expect(limit.reason).toBe('Motif commercial ajusté');
        expect(primary.save).toHaveBeenCalledWith({ session });
        expect(limit.save).toHaveBeenCalledWith({ session });
        expect(result.relatedOverrides[0].limitValue).toBe(25_000_000);
    });

    it('révoque atomiquement la feature et toutes les limites du groupe', async () => {
        const actorId = createId();
        const workspaceId = createId();
        const groupId = createId();
        const primary = createOverrideDocument({
            workspaceId,
            actorId,
            groupId,
        });
        const firstLimit = createLimitDocument({
            workspaceId,
            actorId,
            groupId,
            metricKey: 'storage_bytes',
        });
        const secondLimit = createLimitDocument({
            workspaceId,
            actorId,
            groupId,
            metricKey: 'file_uploads_monthly',
            limitValue: 30,
        });

        vi.spyOn(EntitlementOverride, 'findById')
            .mockReturnValue(buildSessionQuery(primary));
        vi.spyOn(EntitlementOverride, 'find')
            .mockReturnValue(buildSessionQuery([firstLimit, secondLimit]));

        const result = await revokePlatformFeatureOverrideGroup({
            overrideId: primary._id,
            reason: 'Fin de l’accord commercial',
            actorId,
            now: NOW,
            ipAddress: '127.0.0.1',
            userAgent: 'Vitest',
        });

        for (const override of [primary, firstLimit, secondLimit]) {
            expect(override.revokedAt).toBe(NOW);
            expect(override.revokedBy).toBe(actorId);
            expect(override.revokeReason).toBe('Fin de l’accord commercial');
            expect(override.updatedBy).toBe(actorId);
            expect(override.save).toHaveBeenCalledWith({ session });
        }

        expect(createAuditLog).toHaveBeenCalledTimes(3);
        for (const [auditData, auditOptions] of createAuditLog.mock.calls) {
            expect(auditData.action)
                .toBe(AUDIT_ACTION.ENTITLEMENT_OVERRIDE_REVOKED);
            expect(auditData.metadata.groupId).toBe(groupId.toString());
            expect(auditOptions).toEqual({ session });
        }
        expect(result.primaryOverride.lifecycle).toBe('revoked');
        expect(result.relatedOverrides.every(
            (override) => override.lifecycle === 'revoked',
        )).toBe(true);
    });

    it('propage un échec d’audit afin que la transaction de révocation échoue', async () => {
        const actorId = createId();
        const groupId = createId();
        const primary = createOverrideDocument({ groupId });
        const limit = createLimitDocument({
            workspaceId: primary.workspace,
            actorId: primary.grantedBy,
            groupId,
        });
        const auditError = new Error('AuditLog unavailable');

        vi.spyOn(EntitlementOverride, 'findById')
            .mockReturnValue(buildSessionQuery(primary));
        vi.spyOn(EntitlementOverride, 'find')
            .mockReturnValue(buildSessionQuery([limit]));
        createAuditLog.mockRejectedValueOnce(auditError);

        await expect(revokePlatformFeatureOverrideGroup({
            overrideId: primary._id,
            reason: 'Fin de l’accord commercial',
            actorId,
            now: NOW,
        })).rejects.toBe(auditError);
    });

    it('refuse la révocation groupée d’une dérogation historique non groupée', async () => {
        const primary = createOverrideDocument({ groupId: null });

        vi.spyOn(EntitlementOverride, 'findById')
            .mockReturnValue(buildSessionQuery(primary));

        await expect(revokePlatformFeatureOverrideGroup({
            overrideId: primary._id,
            reason: 'Fin de l’accord commercial',
            actorId: createId(),
            now: NOW,
        })).rejects.toMatchObject({
            statusCode: 409,
        });

        expect(primary.save).not.toHaveBeenCalled();
    });

    it('interdit update et revoke unitaires sur un document groupé', async () => {
        const groupedOverride = createLimitDocument();
        const findByIdSpy = vi.spyOn(EntitlementOverride, 'findById');

        findByIdSpy.mockReturnValueOnce(buildSessionQuery(groupedOverride));

        await expect(updatePlatformEntitlementOverride({
            overrideId: groupedOverride._id,
            overrideData: {
                limitValue: 10,
            },
            actorId: createId(),
            now: NOW,
        })).rejects.toMatchObject({
            statusCode: 409,
        });

        expect(groupedOverride.save).not.toHaveBeenCalled();

        findByIdSpy.mockReturnValueOnce(buildSessionQuery(groupedOverride));

        await expect(revokePlatformEntitlementOverride({
            overrideId: groupedOverride._id,
            reason: 'Tentative de révocation isolée',
            actorId: createId(),
            now: NOW,
        })).rejects.toMatchObject({
            statusCode: 409,
        });

        expect(groupedOverride.save).not.toHaveBeenCalled();
        expect(createAuditLog).not.toHaveBeenCalled();
    });
});
