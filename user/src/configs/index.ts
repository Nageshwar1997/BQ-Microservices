import { envs } from '@/envs';
import { TAuthProvider } from '@beautinique/be-constants';
import { LoggerMiddleware } from '@beautinique/be-middlewares';
import { connection, ConnectOptions } from 'mongoose';
import { ParsedQs } from 'qs';
import { createClient, RedisClientType } from 'redis';
import { google } from 'googleapis';
import axios from 'axios';
import { parseData } from '@beautinique/be-utils';

export const databaseConfigs = {
  uri: envs.is_dev ? envs.mongo_uri.dev : envs.mongo_uri.prod,
  isDev: true,
  options: { dbName: 'user-service' } as ConnectOptions,
};

export const isDbConnected = () => connection.readyState === 1;

export const { requestLog, errorLog, logger } = LoggerMiddleware.createLogger({
  logDir: 'logs',
  level: 'info',
});

export const redisClientConfig: RedisClientType = createClient({
  socket: {
    host: envs.redis.host,
    port: Number(envs.redis.port),
    reconnectStrategy: (retries: number): number | false => {
      if (retries >= 5) {
        // Max reconnect attempts
        console.error('❌ Max Redis reconnection attempts reached');
        return false;
      }
      const delay = Math.min(retries * 1000, 10000); //10s
      console.log(`🔄 Redis reconnecting in ${delay}ms (attempt ${retries + 1})`);
      return delay;
    },
  },
  password: envs.redis.password,
});

const getSocialAuthRedirectURL = (provider: Exclude<TAuthProvider, 'MANUAL'>) => {
  const baseURL = envs.is_dev ? envs.url.gateway.dev : envs.url.gateway.prod;

  const redirectMap: Partial<Record<Exclude<TAuthProvider, 'MANUAL'>, string>> = {
    GOOGLE: envs.oAuth.google.redirect_endpoint,
    LINKEDIN: envs.oAuth.linkedin.redirect_endpoint,
    GITHUB: envs.oAuth.github.redirect_endpoint,
  };

  return `${baseURL}${redirectMap[provider]}`;
};

const googleAuthConfig = new google.auth.OAuth2(
  envs.oAuth.google.client_id,
  envs.oAuth.google.client_secret,
  getSocialAuthRedirectURL('GOOGLE'),
);

export const googleAuthClient = {
  url: googleAuthConfig.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email',
    ],
    prompt: 'consent',
    redirect_uri: getSocialAuthRedirectURL('GOOGLE'),
  }),

  decode: async (code: string | ParsedQs | (string | ParsedQs)[]) => {
    const { tokens } = await googleAuthConfig.getToken(code.toString());

    googleAuthConfig.setCredentials(tokens);

    const { data } = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    return data;
  },
};

export const linkedinAuthClient = {
  url: `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${envs.oAuth.linkedin.client_id}&redirect_uri=${encodeURIComponent(
    getSocialAuthRedirectURL('LINKEDIN'),
  )}&scope=openid%20profile%20email`,
  token_response: async (code: string | ParsedQs | (string | ParsedQs)[]) => {
    const { data } = await axios.post(`https://www.linkedin.com/oauth/v2/accessToken`, null, {
      params: {
        grant_type: 'authorization_code',
        code,
        redirect_uri: getSocialAuthRedirectURL('LINKEDIN'),
        client_id: envs.oAuth.linkedin.client_id,
        client_secret: envs.oAuth.linkedin.client_secret,
      },
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    return data;
  },
  decode: (id_token: string) => {
    const base64Payload = id_token.split('.')[1];
    const decoded = parseData(Buffer.from(base64Payload, 'base64').toString());

    return decoded;
  },
};

export const githubAuthClient = {
  url: `https://github.com/login/oauth/authorize?${new URLSearchParams({
    client_id: envs.oAuth.github.client_id,
    redirect_uri: getSocialAuthRedirectURL('GITHUB'),
    scope: 'read:user user:email',
    allow_signup: 'true',
  }).toString()}`,
  token_response: async (code: string | ParsedQs | (string | ParsedQs)[]) => {
    const { data } = await axios.post(
      'https://github.com/login/oauth/access_token',
      {
        client_id: envs.oAuth.github.client_id,
        client_secret: envs.oAuth.github.client_secret,
        code,
        redirect_uri: getSocialAuthRedirectURL('GITHUB'),
      },
      { headers: { Accept: 'application/json' } },
    );

    return data;
  },
  decode: async (access_token: string) => {
    const headers = { Authorization: `Bearer ${access_token}` };

    const { data } = await axios.get('https://api.github.com/user', {
      headers,
    });

    const profile = data;

    if (!profile.email) {
      const { data: emails } = await axios.get('https://api.github.com/user/emails', { headers });

      const email =
        emails.find((email: Record<string, string | boolean>) => email.primary)?.email ||
        emails[0]?.email;
      profile.email = email || '';
    }

    return profile;
  },
};
