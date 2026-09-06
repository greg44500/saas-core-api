import { describe, expect, it } from 'vitest';

import {
    AUDIT_ACTION,
    AUDIT_ENTITY_TYPE,
    AUDIT_STATUS,
} from '../../constants/auditActions.constants.js';
import {
    getAuditMetadata,
} from '../../modules/auditLog/auditMetadata.service.js';


describe('auditMetadata.service', () => {
    it('expose automatiquement toutes les valeurs du registre canonique', () => {
        const metadata = getAuditMetadata();

        expect(metadata.actions.map(({ value }) => value))
            .toEqual(Object.values(AUDIT_ACTION));
        expect(metadata.entityTypes.map(({ value }) => value))
            .toEqual(Object.values(AUDIT_ENTITY_TYPE));
        expect(metadata.statuses.map(({ value }) => value))
            .toEqual(Object.values(AUDIT_STATUS));
    });

    it('fournit un libellé métier explicite pour chaque valeur exposée', () => {
        const metadata = getAuditMetadata();

        for (const collection of Object.values(metadata)) {
            for (const item of collection) {
                expect(item.value).toEqual(expect.any(String));
                expect(item.value.length).toBeGreaterThan(0);
                expect(item.label).toEqual(expect.any(String));
                expect(item.label.trim().length).toBeGreaterThan(0);
            }
        }
    });

    it('expose EntitlementOverride sous le libellé français Dérogation', () => {
        const metadata = getAuditMetadata();
        const entitlementOverride = metadata.entityTypes.find(
            ({ value }) => value === AUDIT_ENTITY_TYPE.ENTITLEMENT_OVERRIDE,
        );

        expect(entitlementOverride).toEqual({
            value: 'EntitlementOverride',
            label: 'Dérogation',
        });
    });
});
