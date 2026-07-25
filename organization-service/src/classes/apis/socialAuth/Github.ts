import { AUTH_PROVIDER_MAP, HEADERS_MAP } from '@beautinique/shared-constants';

import { OAUTH_API_ROUTES_AND_METHODS } from '../../../constants/index.js';
import { envs } from '../../../envs/index.js';
import { getSocialAuthRedirectURL } from '../../../utils/index.js';
import { ApiRequest } from '../ApiRequest.js';

export class Github extends ApiRequest {
  private readonly routes = OAUTH_API_ROUTES_AND_METHODS.github;
  private readonly REDIRECT_URI = getSocialAuthRedirectURL(AUTH_PROVIDER_MAP.GITHUB);

  public url() {
    const params = new URLSearchParams({
      client_id: envs.oAuth.github.client_id,
      redirect_uri: this.REDIRECT_URI,
      scope: 'read:user user:email',
      allow_signup: 'true',
    });
    return `${OAUTH_API_ROUTES_AND_METHODS.github.access_token.baseURL}/login/oauth/authorize?${params.toString()}`;
  }

  public access_token(code: string) {
    return this.request<{ access_token: string }>({
      ...this.routes.access_token,
      data: {
        client_id: envs.oAuth.github.client_id,
        client_secret: envs.oAuth.github.client_secret,
        code,
        redirect_uri: this.REDIRECT_URI,
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
