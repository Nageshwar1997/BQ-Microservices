import { ParsedQs } from 'qs';
import { ApiRequest } from './ApiRequest';
import { envs } from '@/envs';

export class OAuthService extends ApiRequest {
  public google_decode(access_token?: string | null) {
    return this.request({
      ...this.routes.oAuth.google.decode,
      headers: { Authorization: `Bearer ${access_token}` },
    });
  }

  public linkedin_access_token(
    code: string | ParsedQs | (string | ParsedQs)[],
    redirect_uri: string,
  ) {
    return this.request({
      ...this.routes.oAuth.linkedin.access_token,
      data: {
        grant_type: 'authorization_code',
        code,
        redirect_uri,
        client_id: envs.oAuth.linkedin.client_id,
        client_secret: envs.oAuth.linkedin.client_secret,
      },
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  }

  public github_access_token(
    code: string | ParsedQs | (string | ParsedQs)[],
    redirect_uri: string,
  ) {
    return this.request({
      ...this.routes.oAuth.github.access_token,
      data: {
        client_id: envs.oAuth.github.client_id,
        client_secret: envs.oAuth.github.client_secret,
        code,
        redirect_uri,
      },
      headers: { Accept: 'application/json' },
    });
  }

  public async github_decode(access_token: string) {
    const headers = { Authorization: `Bearer ${access_token}` };
    const profile = await this.request({ ...this.routes.oAuth.github.decode_profile, headers });

    if (!profile.email) {
      const emails = await this.request({ ...this.routes.oAuth.github.decode_emails, headers });

      const email =
        emails.find((email: Record<string, string | boolean>) => email.primary)?.email ||
        emails[0]?.email;
      profile.email = email || '';
    }

    return profile;
  }
}
