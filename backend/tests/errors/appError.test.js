import { describe, expect, it } from "vitest";

import { AppError } from "../../utils/AppError.js";

describe("AppError", () => {
    it("crée une erreur opérationnelle de type fail pour un code HTTP 4xx", () => {
        const error = new AppError("Données invalides", 400);

        expect(error).toBeInstanceOf(Error);
        expect(error).toBeInstanceOf(AppError);
        expect(error.name).toBe("AppError");
        expect(error.message).toBe("Données invalides");
        expect(error.statusCode).toBe(400);
        expect(error.status).toBe("fail");
        expect(error.isOperational).toBe(true);
    });

    it("crée une erreur opérationnelle de type error pour un code HTTP 5xx", () => {
        const error = new AppError("Service indisponible", 503);

        expect(error.statusCode).toBe(503);
        expect(error.status).toBe("error");
        expect(error.isOperational).toBe(true);
    });
});