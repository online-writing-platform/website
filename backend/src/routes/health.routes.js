const express = require("express");

const router = express.Router();

router.get("/", (req, res) => {
    return res.status(200).json({
        status: "ok",
        service: "backend",
        timestamp: new Date().toISOString(),
    });
});

module.exports = router;
