import { Router } from "express";

import { authenticate } from "../../auth/index.js";
import { listMyEntitlements } from "./entitlement.controller.js";

const router = Router();

router.get("/me", authenticate, listMyEntitlements);

export default router;
