import { envs } from "@/envs";
import { oAuthService } from "@/services";
import { TAuthProvider } from "@beautinique/be-constants";
import { parseData } from "@beautinique/be-utils";
import { ParsedQs } from 'qs';
import { google } from "googleapis";

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

    return await oAuthService.google_decode(tokens.access_token);
  },
};

export const linkedinAuthClient = {
  url: `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${envs.oAuth.linkedin.client_id}&redirect_uri=${encodeURIComponent(
    getSocialAuthRedirectURL('LINKEDIN'),
  )}&scope=openid%20profile%20email`,
  access_token: async (code: string | ParsedQs | (string | ParsedQs)[]) => {
    return await oAuthService.linkedin_access_token(code, getSocialAuthRedirectURL('LINKEDIN'));
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
  access_token: async (code: string | ParsedQs | (string | ParsedQs)[]) => {
    return await oAuthService.github_access_token(code, getSocialAuthRedirectURL('GITHUB'));
  },
  decode: async (access_token: string) => {
    return await oAuthService.github_decode(access_token);
  },
};
