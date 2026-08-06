import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { app } from '../../app.js';

describe("Route introuvable", () => {
    it("retourne un statut 404 et un message d'erreur pour une route non trouvée", async () => {
        const response = await request(app).get("/api/route-inexistante");
        expect(response.status).toBe(404);
        expect(response.headers["content-type"]).toMatch(/json/);
        expect(response.body.status).toBe("fail");
        expect(response.body.message).toBe("Route introuvable");
    });
});