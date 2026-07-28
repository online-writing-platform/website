import { Router } from "express";

import { register } from "../controllers/auth.controller";
import { validateRegisterRequest } from "../validators/auth.validator";

const router = Router();

router.post("/register", validateRegisterRequest, register);

export default router;
