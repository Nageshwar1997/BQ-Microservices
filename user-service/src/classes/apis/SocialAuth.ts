import type { TAuthProvider } from '@beautinique/be-constants';
import { google } from 'googleapis';
import { HEADERS_KEYS, OAUTH_API_ROUTES_AND_METHODS } from '../../constants';
import { envs } from '../../envs';
import { ApiRequest } from './ApiRequest';

function getSocialAuthRedirectURL(provider: Exclude<TAuthProvider, 'MANUAL'>) {
  const redirectMap: Partial<Record<Exclude<TAuthProvider, 'MANUAL'>, string>> = {
    GOOGLE: envs.oAuth.google.redirect_endpoint,
    LINKEDIN: envs.oAuth.linkedin.redirect_endpoint,
    GITHUB: envs.oAuth.github.redirect_endpoint,
  };

  return `${envs.url.gateway}${redirectMap[provider]}`;
}

class GoogleAuth extends ApiRequest {
  private readonly routes = OAUTH_API_ROUTES_AND_METHODS.google;
  private getClient() {
    return new google.auth.OAuth2(
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

    const { tokens } = await client.getToken(code.toString());
    client.setCredentials(tokens);

    return this.request({
      ...this.routes.decode,
      headers: { [HEADERS_KEYS.authorization]: `Bearer ${tokens.access_token}` },
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
    return this.request({
      ...this.routes.access_token,
      data: {
        grant_type: 'authorization_code',
        code,
        redirect_uri: getSocialAuthRedirectURL('LINKEDIN'),
        client_id: envs.oAuth.linkedin.client_id,
        client_secret: envs.oAuth.linkedin.client_secret,
      },
      headers: { [HEADERS_KEYS.contentType]: 'application/x-www-form-urlencoded' },
    });
  }

  public decode(access_token: string) {
    return this.request({
      ...this.routes.decode,
      headers: { [HEADERS_KEYS.authorization]: `Bearer ${access_token}` },
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
    return this.request({
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
    const headers = { [HEADERS_KEYS.authorization]: `Bearer ${access_token}` };
    const profile = await this.request({ ...this.routes.decode_profile, headers });

    if (!profile.email) {
      const emails = await this.request({ ...this.routes.decode_emails, headers });

      const email =
        emails.find((email: Record<string, string | boolean>) => email.primary)?.email ||
        emails[0]?.email;
      profile.email = email || '';
    }

    return profile;
  }
}

export const googleAuth = new GoogleAuth();
export const linkedinAuth = new LinkedinAuth();
export const githubAuth = new GithubAuth();
