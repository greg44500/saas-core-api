import { Router } from "express";

const healthRouter = Router();

healthRouter.get('/', (req, res) => {
    return res.status(200).json({
        status: "success",
        message: "API opérationnelle"
    })
})

export { healthRouter }