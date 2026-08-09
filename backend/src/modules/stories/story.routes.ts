import { Router } from "express";

import { getStories } from "./story.controller.js";

const router = Router();

router.get("/", getStories);

export default router;
