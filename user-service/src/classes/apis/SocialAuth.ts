import { AUTH_PROVIDER_MAP, HEADERS_MAP } from '@beautinique/shared-constants';
import { OAuth2Client } from 'google-auth-library';

import { OAUTH_API_ROUTES_AND_METHODS } from '../../constants/index.js';
import { envs } from '../../envs/index.js';
import type { TSocialAuthProvider } from '../../types/index.js';
import { ApiRequest } from './ApiRequest.js';

function getSocialAuthRedirectURL(provider: TSocialAuthProvider) {
  const redirectMap: Record<TSocialAuthProvider, string> = {
    [AUTH_PROVIDER_MAP.GOOGLE]: envs.oAuth.google.redirect_endpoint,
    [AUTH_PROVIDER_MAP.LINKEDIN]: envs.oAuth.linkedin.redirect_endpoint,
    [AUTH_PROVIDER_MAP.GITHUB]: envs.oAuth.github.redirect_endpoint,
  };
  const endpoint = redirectMap[provider];

  return `${envs.url.gateway}${endpoint}`;
}

class GoogleAuth extends ApiRequest {
  private readonly routes = OAUTH_API_ROUTES_AND_METHODS.google;
  private getClient() {
    return new OAuth2Client(
      envs.oAuth.google.client_id,
      envs.oAuth.google.client_secret,
      getSocialAuthRedirectURL('GOOGLE'),
    );
  }

  public url() {
    const client = this.getClient();

    return client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/userinfo.email',
      ],
      prompt: 'consent',
    });
  }

  public async decode(code: string) {
    const client = this.getClient();

    const { tokens } = await client.getToken(code);
    client.setCredentials(tokens);

    return this.request<Record<string, string> | undefined>({
      ...this.routes.decode,
      ...(tokens.access_token && {
        headers: { [HEADERS_MAP.authorization]: `Bearer ${tokens.access_token}` },
      }),
    });
  }
}

class LinkedinAuth extends ApiRequest {
  private readonly routes = OAUTH_API_ROUTES_AND_METHODS.linkedin;
  public url() {
    const redirectUri = encodeURIComponent(getSocialAuthRedirectURL('LINKEDIN'));
    const client_id = envs.oAuth.linkedin.client_id;
    return `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${client_id}&redirect_uri=${
      redirectUri
    }&scope=openid%20profile%20email`;
  }

  public access_token(code: string) {
    return this.request<{ access_token: string }>({
      ...this.routes.access_token,
      data: {
        grant_type: 'authorization_code',
        code,
        redirect_uri: getSocialAuthRedirectURL('LINKEDIN'),
        client_id: envs.oAuth.linkedin.client_id,
        client_secret: envs.oAuth.linkedin.client_secret,
      },
      headers: { [HEADERS_MAP.contentType]: 'application/x-www-form-urlencoded' },
    });
  }

  public decode(access_token: string) {
    return this.request<Record<string, string> | undefined>({
      ...this.routes.decode,
      headers: { [HEADERS_MAP.authorization]: `Bearer ${access_token}` },
    });
  }
}

class GithubAuth extends ApiRequest {
  private readonly routes = OAUTH_API_ROUTES_AND_METHODS.github;
  public url() {
    const params = new URLSearchParams({
      client_id: envs.oAuth.github.client_id,
      redirect_uri: getSocialAuthRedirectURL('GITHUB'),
      scope: 'read:user user:email',
      allow_signup: 'true',
    });
    return `https://github.com/login/oauth/authorize?${params.toString()}`;
  }
  public access_token(code: string) {
    return this.request<{ access_token: string }>({
      ...this.routes.access_token,
      data: {
        client_id: envs.oAuth.github.client_id,
        client_secret: envs.oAuth.github.client_secret,
        code,
        redirect_uri: getSocialAuthRedirectURL('GITHUB'),
      },
      headers: { Accept: 'application/json' },
    });
  }
  public async decode(access_token: string) {
    const headers = { [HEADERS_MAP.authorization]: `Bearer ${access_token}` };
    const profile = await this.request<Record<string, string> | undefined>({
      ...this.routes.decode_profile,
      headers,
    });

    if (!!profile && !profile.email) {
      const emails = await this.request<Record<string, string | boolean>[]>({
        ...this.routes.decode_emails,
        headers,
      });

      const filteredEmails = emails.find((email) => email.primary);

      const email = filteredEmails?.email ?? emails[0]?.email;

      profile.email = email as string;
    }

    return profile;
  }
}

export const googleAuth = new GoogleAuth();
export const linkedinAuth = new LinkedinAuth();
export const githubAuth = new GithubAuth();
