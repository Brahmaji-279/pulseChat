"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
const env_js_1 = require("../config/env.js");
function errorHandler(err, _req, res, _next) {
    console.error('[PulseChat Error]', err);
    const statusCode = err.status || 500;
    const message = env_js_1.ENV.NODE_ENV === 'production' && statusCode === 500
        ? 'An unexpected internal error occurred'
        : err.message || 'Server error';
    res.status(statusCode).json({
        success: false,
        error: message,
    });
}
