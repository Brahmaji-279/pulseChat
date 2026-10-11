"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.PublicKey = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const PublicKeySchema = new mongoose_1.Schema({
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    keyId: {
        type: String,
        required: true,
        trim: true,
    },
    algorithm: {
        type: String,
        enum: ['ML-KEM-768', 'ML-DSA-65'],
        required: true,
    },
    publicKey: {
        type: String,
        required: true,
    },
    keyVersion: {
        type: Number,
        required: true,
        default: 1,
    },
    signatureOrBinding: {
        type: String,
    },
    fingerprint: {
        type: String,
        required: true,
        index: true,
    },
    isCurrent: {
        type: Boolean,
        default: true,
    },
    expiresAt: {
        type: Date,
    },
    revokedAt: {
        type: Date,
        default: null,
    },
}, {
    timestamps: true,
});
PublicKeySchema.index({ userId: 1, algorithm: 1, isCurrent: 1 });
PublicKeySchema.index({ userId: 1, keyId: 1 }, { unique: true });
exports.PublicKey = mongoose_1.default.model('PublicKey', PublicKeySchema);
