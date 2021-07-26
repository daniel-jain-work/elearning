"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.decodeToken = exports.createToken = void 0;
const config = require("config");
const jwt = require("jsonwebtoken");
const tokenSecret = config.get('jwt.key');
const tokenOpts = config.get('jwt.opts');
function createToken(user) {
    const payload = {
        userId: user.id,
        email: user.email,
        teacherId: user.teacherId || null,
        isAdmin: user.isAdmin,
        isOps: user.isOps
    };
    return jwt.sign(payload, tokenSecret, tokenOpts);
}
exports.createToken = createToken;
function decodeToken(token) {
    return jwt.verify(token, tokenSecret);
}
exports.decodeToken = decodeToken;
