import { Router } from "express";

import { getStories } from "../controllers/story.controller.js";

const router = Router();

router.get("/", getStories);

export default router;
