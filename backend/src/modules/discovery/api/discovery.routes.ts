import { Router } from "express";

import { optionalAuthenticate } from "../../auth/index.js";
import { getDiscoveryHome } from "./discovery.controller.js";

const router = Router();

router.get("/home", optionalAuthenticate, getDiscoveryHome);

export default router;
