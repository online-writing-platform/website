const express = require("express");

const { register } = require("../controllers/auth.controller");
const { validateRegisterRequest } = require("../validators/auth.validator");

const router = express.Router();

router.post("/register", validateRegisterRequest, register);

module.exports = router;
