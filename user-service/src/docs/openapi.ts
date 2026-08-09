import {
  AUTH_PROVIDER_MAP,
  AUTH_PROVIDERS,
  HEADERS_MAP,
  SERVICE_NAMES_MAP,
  USER_ROLE_MAP,
  USER_ROLES,
} from '@beautinique/backend-constants';

import { METHODS_AND_PATHS } from '../constants/index.js';

const { base, health, auth, user } = METHODS_AND_PATHS;
const { login, logout, register, password } = auth;

const successEnvelope = (dataSchema?: object) => ({
  type: 'object',
  properties: {
    success: { type: 'boolean', example: true },
    message: { type: 'string' },
    ...(dataSchema && { data: dataSchema }),
  },
});

const errorEnvelope = {
  type: 'object',
  properties: {
    success: { type: 'boolean', example: false },
    code: { type: 'string', example: 'VALIDATION_ERROR' },
    message: { type: 'string' },
    fieldErrors: { type: 'object', nullable: true },
    globalErrors: { type: 'array', items: { type: 'string' }, nullable: true },
  },
};

const errorResponse = (description: string) => ({
  description,
  content: { 'application/json': { schema: errorEnvelope } },
});

const minimalUserSchema = {
  type: 'object',
  properties: {
    _id: { type: 'string', example: '65f1c2e4b8f1a2a3b4c5d6e7' },
    firstName: { type: 'string' },
    lastName: { type: 'string' },
    email: { type: 'string', format: 'email' },
    phoneNumber: { type: 'string' },
    avatar: { type: 'string' },
    role: { type: 'string', enum: USER_ROLES, example: USER_ROLE_MAP.USER },
    providers: {
      type: 'array',
      items: { type: 'string', enum: AUTH_PROVIDERS, example: AUTH_PROVIDER_MAP.MANUAL },
    },
  },
};

const otpTokenResponse = {
  '200': {
    description: 'OTP sent. `data` is the opaque session token to send back as `Authorization`.',
    content: {
      'application/json': {
        schema: successEnvelope({ type: 'string', example: 'a1b2c3d4e5f6...' }),
      },
    },
  },
  '401': errorResponse(`Missing/invalid ${HEADERS_MAP.serviceSecret} header.`),
  '503': errorResponse('Database is unavailable.'),
};

const otpAuthHeader = {
  name: HEADERS_MAP.authorization,
  in: 'header',
  required: true,
  description:
    'The OTP session token returned by the corresponding "send-otp" call (raw or `Bearer <token>`).',
  schema: { type: 'string' },
};

export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'User Service API',
    version: '1.0.0',
    description:
      'Identity and authentication service for Beautinique: manual + OAuth (Google/LinkedIn/GitHub) login, ' +
      'OTP-verified registration and password reset, session lookup, and a Redis-backed user/session cache. ' +
      'See the [README](/) for the full flow diagrams and error code reference.',
  },
  servers: [{ url: '/', description: 'This service' }],
  tags: [
    { name: 'Health', description: 'Service health check' },
    { name: 'Login', description: 'Manual and OAuth login' },
    { name: 'Register', description: 'OTP-based registration' },
    { name: 'Password', description: 'Forgot / change / set password' },
    { name: 'Logout', description: 'Session invalidation' },
    { name: 'User', description: 'Current session lookup' },
  ],
  components: {
    securitySchemes: {
      serviceSecret: {
        type: 'apiKey',
        in: 'header',
        name: HEADERS_MAP.serviceSecret,
        description: `Shared secret required on every ${base}/* request (typically set by the API gateway).`,
      },
      userId: {
        type: 'apiKey',
        in: 'header',
        name: HEADERS_MAP.userId,
        description: "The authenticated end user's id, forwarded by the caller (no JWT here).",
      },
    },
  },
  security: [{ serviceSecret: [] }],
  paths: {
    [health.path]: {
      [health.method]: {
        tags: ['Health'],
        summary: 'Liveness + MongoDB connection status',
        security: [],
        responses: {
          '200': {
            description: 'Service is up (database may still be down - check `data.database`).',
            content: {
              'application/json': {
                schema: successEnvelope({
                  type: 'object',
                  properties: {
                    database: { type: 'object' },
                    service: { type: 'string', example: SERVICE_NAMES_MAP['user-service'] },
                  },
                }),
              },
            },
          },
        },
      },
    },

    [`${base}${auth.base}${login.base}${login.manual.path}`]: {
      [login.manual.method]: {
        tags: ['Login'],
        summary: 'Manual email/phone + password login',
        parameters: [
          {
            name: HEADERS_MAP.loginRole,
            in: 'header',
            required: false,
            description: 'If set, the logged-in user must have this role (MASTER always allowed).',
            schema: { type: 'string', enum: USER_ROLES, example: USER_ROLE_MAP.USER },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['loginMethod', 'password'],
                properties: {
                  loginMethod: { type: 'string', enum: ['email', 'phoneNumber'] },
                  email: { type: 'string', format: 'email' },
                  phoneNumber: { type: 'string' },
                  password: { type: 'string', format: 'password' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Logged in. User is cached in Redis (24h TTL).',
            content: { 'application/json': { schema: successEnvelope(minimalUserSchema) } },
          },
          '403': errorResponse('Login role mismatch, or missing/invalid service secret.'),
          '404': errorResponse('No user found for the given email/phone.'),
          '422': errorResponse('Wrong password, or account has no MANUAL provider linked.'),
        },
      },
    },

    ...(['google', 'linkedin', 'github'] as const).reduce<Record<string, unknown>>(
      (paths, provider) => {
        const { redirect, callback } = login.oauth[provider];

        return {
          ...paths,
          [`${base}${auth.base}${login.base}${redirect.path}`]: {
            [redirect.method]: {
              tags: ['Login'],
              summary: `Get the ${provider} OAuth consent URL`,
              responses: {
                '200': {
                  description: 'Redirect the client to this URL to start the OAuth flow.',
                  content: {
                    'application/json': {
                      schema: successEnvelope({ type: 'string', format: 'uri' }),
                    },
                  },
                },
              },
            },
          },
          [`${base}${auth.base}${login.base}${callback.path}`]: {
            [callback.method]: {
              tags: ['Login'],
              summary: `${provider} OAuth callback`,
              parameters: [
                {
                  name: 'code',
                  in: 'query',
                  required: true,
                  description: 'Authorization code issued by the provider.',
                  schema: { type: 'string' },
                },
              ],
              responses: {
                '200': {
                  description:
                    'Logs in (linking the provider to an existing email match) or creates a new user. Cached in Redis.',
                  content: { 'application/json': { schema: successEnvelope(minimalUserSchema) } },
                },
                '400': errorResponse('Missing `code` query parameter.'),
                '404': errorResponse("Provider didn't return an email for this profile."),
              },
            },
          },
        };
      },
      {},
    ),

    [`${base}${auth.base}${logout.path}`]: {
      [logout.method]: {
        tags: ['Logout'],
        summary: "Invalidate the caller's cached session",
        security: [{ serviceSecret: [], userId: [] }],
        responses: {
          '200': {
            description: 'Removed from Redis (no-op if nothing was cached).',
            content: { 'application/json': { schema: successEnvelope() } },
          },
          '401': errorResponse(`Missing ${HEADERS_MAP.userId} header.`),
        },
      },
    },

    [`${base}${auth.base}${register.base}${register.sendOtp.path}`]: {
      [register.sendOtp.method]: {
        tags: ['Register'],
        summary: 'Start registration: send an OTP to email',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email'],
                properties: { email: { type: 'string', format: 'email' } },
              },
            },
          },
        },
        responses: {
          ...otpTokenResponse,
          '409': errorResponse('A MANUAL account already exists for this email.'),
        },
      },
    },
    [`${base}${auth.base}${register.base}${register.resendOtp.path}`]: {
      [register.resendOtp.method]: {
        tags: ['Register'],
        summary: 'Resend the registration OTP',
        parameters: [otpAuthHeader],
        responses: {
          '200': {
            description: 'OTP resent. `data` is the new send count.',
            content: { 'application/json': { schema: successEnvelope({ type: 'integer' }) } },
          },
          '422': errorResponse('Missing/invalid token, or OTP session expired.'),
          '429': errorResponse(`Resent more than MAX_OTP_RESEND (3) times.`),
        },
      },
    },
    [`${base}${auth.base}${register.base}${register.verifyOtp.path}`]: {
      [register.verifyOtp.method]: {
        tags: ['Register'],
        summary: 'Verify the registration OTP',
        parameters: [otpAuthHeader],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['otp'],
                properties: { otp: { type: 'string', example: '123456' } },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'OTP matches.',
            content: { 'application/json': { schema: successEnvelope() } },
          },
          '422': errorResponse('Missing/invalid token, or OTP is wrong/expired.'),
        },
      },
    },
    [`${base}${auth.base}${register.base}${register.saveUser.path}`]: {
      [register.saveUser.method]: {
        tags: ['Register'],
        summary: 'Complete registration (after OTP verification)',
        parameters: [otpAuthHeader],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['firstName', 'lastName', 'password', 'phoneNumber'],
                properties: {
                  firstName: { type: 'string' },
                  lastName: { type: 'string' },
                  password: { type: 'string', format: 'password' },
                  phoneNumber: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description:
              'Creates a MANUAL user (or adds MANUAL to an existing OAuth-only account with the same email). Cached in Redis.',
            content: { 'application/json': { schema: successEnvelope(minimalUserSchema) } },
          },
          '409': errorResponse('Phone number, or a MANUAL account for this email, already exists.'),
          '422': errorResponse('Missing/invalid token, or OTP session expired.'),
        },
      },
    },

    [`${base}${auth.base}${password.base}${password.forgot.sendOtp.path}`]: {
      [password.forgot.sendOtp.method]: {
        tags: ['Password'],
        summary: 'Start forgot-password: send an OTP to email',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email'],
                properties: { email: { type: 'string', format: 'email' } },
              },
            },
          },
        },
        responses: {
          ...otpTokenResponse,
          '422': errorResponse('Account exists but has no MANUAL provider linked.'),
        },
      },
    },
    [`${base}${auth.base}${password.base}${password.forgot.resendOtp.path}`]: {
      [password.forgot.resendOtp.method]: {
        tags: ['Password'],
        summary: 'Resend the forgot-password OTP',
        parameters: [otpAuthHeader],
        responses: {
          '200': {
            description: 'OTP resent. `data` is the new send count.',
            content: { 'application/json': { schema: successEnvelope({ type: 'integer' }) } },
          },
          '422': errorResponse('Missing/invalid token, or OTP session expired.'),
          '429': errorResponse('Resent more than MAX_OTP_RESEND (3) times.'),
        },
      },
    },
    [`${base}${auth.base}${password.base}${password.forgot.verifyOtp.path}`]: {
      [password.forgot.verifyOtp.method]: {
        tags: ['Password'],
        summary: 'Verify the forgot-password OTP',
        parameters: [otpAuthHeader],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['otp'],
                properties: { otp: { type: 'string', example: '123456' } },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'OTP matches.',
            content: { 'application/json': { schema: successEnvelope() } },
          },
          '422': errorResponse('Missing/invalid token, or OTP is wrong/expired.'),
        },
      },
    },
    [`${base}${auth.base}${password.base}${password.forgot.save.path}`]: {
      [password.forgot.save.method]: {
        tags: ['Password'],
        summary: 'Set a new password (after OTP verification)',
        parameters: [otpAuthHeader],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['password'],
                properties: { password: { type: 'string', format: 'password' } },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Password updated. Cache refreshed.',
            content: { 'application/json': { schema: successEnvelope(minimalUserSchema) } },
          },
          '404': errorResponse('No user found for the OTP session email.'),
          '422': errorResponse(
            'Missing/invalid token/session, or new password equals the old one.',
          ),
        },
      },
    },

    [`${base}${user.base}${user.session.path}`]: {
      [user.session.method]: {
        tags: ['User'],
        summary: "Fetch the caller's own user record",
        security: [{ serviceSecret: [], userId: [] }],
        responses: {
          '200': {
            description: 'From Redis if cached, otherwise MongoDB (and re-cached).',
            content: { 'application/json': { schema: successEnvelope(minimalUserSchema) } },
          },
          '401': errorResponse(`Missing ${HEADERS_MAP.userId} header.`),
          '404': errorResponse('No user found for this id.'),
        },
      },
    },
    [`${base}${user.base}${user.password.base}${user.password.change.path}`]: {
      [user.password.change.method]: {
        tags: ['Password'],
        summary: 'Change password while logged in',
        security: [{ serviceSecret: [], userId: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['currentPassword', 'password'],
                properties: {
                  currentPassword: { type: 'string', format: 'password' },
                  password: { type: 'string', format: 'password' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Password updated. Cache refreshed.',
            content: { 'application/json': { schema: successEnvelope(minimalUserSchema) } },
          },
          '401': errorResponse(`Missing ${HEADERS_MAP.userId} header.`),
          '422': errorResponse('Wrong current password, or new password equals the current one.'),
        },
      },
    },
    [`${base}${user.base}${user.password.base}${user.password.set.path}`]: {
      [user.password.set.method]: {
        tags: ['Password'],
        summary: 'Set an initial password for an OAuth-only account',
        security: [{ serviceSecret: [], userId: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['password'],
                properties: { password: { type: 'string', format: 'password' } },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Password set. Cache refreshed.',
            content: { 'application/json': { schema: successEnvelope(minimalUserSchema) } },
          },
          '401': errorResponse(`Missing ${HEADERS_MAP.userId} header.`),
          '422': errorResponse('MANUAL provider is already linked - use forgot-password instead.'),
        },
      },
    },
  },
};
