const express = require("express");

const router = express.Router();

router.post("/register", (req, res) => {
    const { email, password, username, displayName } = req.body;

    res.json({
        message: "Register request recieved",
        recievedData: {
            email: email,
            password: password,
            username: username,
            displayName: displayName,
        },
    });
});

module.exports = router;
