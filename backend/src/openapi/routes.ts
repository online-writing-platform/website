import { Router } from "express";
import { createOpenApiDocument } from "./document.js";

const router = Router();
router.get("/openapi.json", (_request, response) => {
    response.status(200).json(createOpenApiDocument());
});
export default router;
