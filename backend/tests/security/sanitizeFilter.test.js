import { describe, expect, it } from "vitest";
import mongoose from "mongoose";

import '../../config/db.js';

describe('Configuration mongoose sanitizeFilter', () => {
    it('active sanitizeFilter globalement', () => {
        expect(mongoose.get('sanitizeFilter')).toBe(true); // Test la configuration
    });
    //teste le comportement de sanitization fourni par Mongoose
    it('neutralise un opérateur MongoDB injecté dans une valeur de filtre', () => {
        const filter = {
            email: 'user@example.com',
            password: {
                $ne: null,
            },
        };

        mongoose.sanitizeFilter(filter);

        expect(filter).toEqual({
            email: 'user@example.com',
            password: {
                $eq: {
                    $ne: null
                },
            },
        });
    });
});