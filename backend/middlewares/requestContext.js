import { randomUUID } from 'node:crypto';

const requestContext = (req, res, next) => {
    // On regroupe tout le contexte dans req.context
    req.context = {
        requestId: randomUUID(),
        ipAddress: req.ip,
        userAgent: req.get('user-agent') ?? null,
    };
    next()
};

export { requestContext };