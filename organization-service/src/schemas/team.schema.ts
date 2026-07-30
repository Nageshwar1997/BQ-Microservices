// import {
//   AUTH_PROVIDER_MAP,
//   AUTH_PROVIDERS,
//   USER_ROLE_MAP,
//   USER_ROLES,
// } from '@beautinique/backend-constants';
// import { Schema } from 'mongoose';

// export const teamSchema = new Schema(
//   {
//     firstName: { type: String, trim: true, required: true },
//     lastName: { type: String, trim: true, required: true },
//     phoneNumber: { type: String, trim: true, default: '' },
//     email: { type: String, trim: true, lowercase: true, required: true },
//     avatar: { type: String, default: '', trim: true },
//     role: { type: String, enum: USER_ROLES, default: USER_ROLE_MAP.USER },
//     password: { type: String, trim: true, default: '' },
//     providers: {
//       type: [{ type: String, enum: AUTH_PROVIDERS }],
//       default: [AUTH_PROVIDER_MAP.MANUAL],
//     },
//     status: { type: String, enum: USER_STATUS, default: 'ACTIVE' },
//     reason: { type: String },
//   },
//   { versionKey: false, timestamps: true },
// );

// userSchema.index({ email: 1 }, { unique: true });

// userSchema.index(
//   { phoneNumber: 1 },
//   { unique: true, partialFilterExpression: { phoneNumber: { $exists: true, $ne: '' } } },
// );

// /* ---------------- SEARCH INDEXES ---------------- */

// userSchema.index({ firstName: 1 });

// userSchema.index({ lastName: 1 });

// userSchema.index({ firstName: 1, lastName: 1 });

// /* ---------------- FILTER INDEXES ---------------- */

// userSchema.index({ role: 1 });

// userSchema.index({ status: 1 });

// /* ---------------- ADMIN LISTING ---------------- */

// userSchema.index({ status: 1, role: 1, createdAt: -1 });
