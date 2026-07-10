async function registerUser(registerData) {
    const { email, username, displayName } = registerData;

    // this function currently creates fake user for test
    // TODO: complete this function

    return {
        id: 1,
        email,
        username,
        displayName,
    };
}

module.exports = {
    registerUser,
};
