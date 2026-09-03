import { describe, expect, it } from 'vitest';

import {
    AUDIT_ACTION,
    AUDIT_ENTITY_TYPE,
    AUDIT_STATUS,
} from '../../constants/auditActions.constants.js';


describe('Audit actions constants', () => {
    it('expose les deux résultats fonctionnels autorisés', () => {
        expect(AUDIT_STATUS).toEqual({
            SUCCESS: 'success',
            FAILED: 'failed',
        });
    });


    it('utilise une valeur unique pour chaque action', () => {
        const actions = Object.values(AUDIT_ACTION);

        expect(new Set(actions).size).toBe(actions.length);
    });


    it('utilise une valeur unique pour chaque type de ressource', () => {
        const entityTypes = Object.values(AUDIT_ENTITY_TYPE);

        expect(new Set(entityTypes).size).toBe(entityTypes.length);
    });


    it('maintient une correspondance exacte entre les clés et les actions', () => {
        for (const [key, value] of Object.entries(AUDIT_ACTION)) {
            expect(value).toBe(key);
        }
    });


    it('protège les registres contre une modification accidentelle', () => {
        expect(Object.isFrozen(AUDIT_STATUS)).toBe(true);
        expect(Object.isFrozen(AUDIT_ACTION)).toBe(true);
        expect(Object.isFrozen(AUDIT_ENTITY_TYPE)).toBe(true);
    });


    it('prévoit séparément le rejet, la suppression et la purge des fichiers', () => {
        expect(AUDIT_ACTION.FILE_UPLOAD_REJECTED)
            .toBe('FILE_UPLOAD_REJECTED');

        expect(AUDIT_ACTION.FILE_DELETED)
            .toBe('FILE_DELETED');

        expect(AUDIT_ACTION.FILE_PURGED)
            .toBe('FILE_PURGED');
    });


    it('prévoit les trois mutations auditables des entitlement overrides', () => {
        expect(AUDIT_ENTITY_TYPE.ENTITLEMENT_OVERRIDE)
            .toBe('EntitlementOverride');
        expect(AUDIT_ACTION.ENTITLEMENT_OVERRIDE_CREATED)
            .toBe('ENTITLEMENT_OVERRIDE_CREATED');
        expect(AUDIT_ACTION.ENTITLEMENT_OVERRIDE_UPDATED)
            .toBe('ENTITLEMENT_OVERRIDE_UPDATED');
        expect(AUDIT_ACTION.ENTITLEMENT_OVERRIDE_REVOKED)
            .toBe('ENTITLEMENT_OVERRIDE_REVOKED');
    });
});