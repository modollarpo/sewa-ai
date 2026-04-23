"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// SEWA AI — backend/src/routes/fhir.ts
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const fhirService_1 = require("../services/fhirService");
const r = (0, express_1.Router)();
r.use(auth_1.authenticate);
r.get('/r4/Patient/:id', async (req, res, next) => { try {
    res.json(await (0, fhirService_1.getFHIRPatient)(req.params.id));
}
catch (e) {
    next(e);
} });
r.get('/r4/ImagingStudy/:id', async (req, res, next) => { try {
    res.json(await (0, fhirService_1.getFHIRImagingStudy)(req.params.id));
}
catch (e) {
    next(e);
} });
exports.default = r;
// ── audit.ts ─────────────────────────────────────────────────
// (separate file)
