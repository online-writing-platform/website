function errorHandler(error, req, res, next) {
    console.error(error);

    const statusCode = error.statusCode || 500;

    return res.status(statusCode).json({
        message: error.message || "Internal Server Error",
    });
}

module.exports = errorHandler;
