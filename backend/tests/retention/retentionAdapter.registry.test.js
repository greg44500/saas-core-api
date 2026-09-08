import { describe, expect, it } from 'vitest';

import {
    CORE_RETENTION_ADAPTERS,
    createRetentionAdapterRegistry,
} from '../../modules/retention/retentionAdapter.registry.js';
import {
    DEFAULT_RETENTION_TARGET_REGISTRY,
} from '../../modules/retention/retentionTarget.registry.js';

describe('retentionAdapter.registry', () => {
    it('enregistre l’adapter AuditLog code-owned', () => {
        const registry = createRetentionAdapterRegistry({
            targetRegistry: DEFAULT_RETENTION_TARGET_REGISTRY,
        });

        const adapter = registry.getAdapter('audit_log');

        expect(adapter).not.toBeNull();
        expect(adapter.preview).toBeTypeOf('function');
        expect(adapter.executeBatch).toBeTypeOf('function');
        expect(CORE_RETENTION_ADAPTERS).toHaveLength(1);
    });

    it('refuse un adapter vers une target absente du registre', () => {
        expect(() => createRetentionAdapterRegistry({
            targetRegistry: DEFAULT_RETENTION_TARGET_REGISTRY,
            adapters: [
                {
                    targetKey: 'unknown_target',
                    preview() {},
                    executeBatch() {},
                },
            ],
        })).toThrow(
            'Retention adapter targets an unknown target',
        );
    });

    it('refuse deux adapters pour la même target', () => {
        expect(() => createRetentionAdapterRegistry({
            targetRegistry: DEFAULT_RETENTION_TARGET_REGISTRY,
            adapters: [
                {
                    targetKey: 'audit_log',
                    preview() {},
                    executeBatch() {},
                },
            ],
        })).toThrow('Duplicate retention adapter: audit_log');
    });
});
