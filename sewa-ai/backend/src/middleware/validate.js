"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = void 0;
const zod_1 = require("zod");
const AppError_1 = require("../utils/AppError");
const validate = (schema) => async (req, res, next) => {
    try {
        const validated = await schema.parseAsync(req.body);
        req.body = validated;
        next();
    }
    catch (err) {
        if (err instanceof zod_1.ZodError) {
            const messages = err.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
            return next(new AppError_1.AppError(`Validation failed: ${messages}`, 400));
        }
        next(err);
    }
};
exports.validate = validate;
