import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { app } from '../app.js';
// Test pour vérifier l'état de santé de l'API
describe("GET /api/health", () => {
    // IT décrit un comportement attendu de l'API. Dans ce cas, on s'attend à ce que l'API retourne un statut 200 et confirme qu'elle est opérationnelle.
    it("retourne un statut 200 et confirme que l'API est opérationnelle", async () => {
        const response = await request(app).get("/api/health");
        // expect effectue une assertion sur la réponse de l'API. 
        // Ici, on vérifie que le code d'état HTTP est 200 (OK), que le type de contenu est JSON et que le corps de la réponse contient les informations attendues.
        expect(response.status).toBe(200); // Vérifie que le code d'état HTTP est 200 (OK)
        expect(response.headers["content-type"]).toMatch(/json/); // Vérifie que le type de contenu de la réponse est JSON
        // Vérifie que le corps de la réponse contient les informations attendues
        expect(response.body).toEqual({
            status: "success",
            message: "API opérationnelle"
        });
    })
})