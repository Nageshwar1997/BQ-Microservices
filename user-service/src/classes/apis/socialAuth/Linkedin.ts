import { AUTH_PROVIDER_MAP, HEADERS_MAP } from '@beautinique/shared-constants';

import { OAUTH_API_ROUTES_AND_METHODS } from '../../../constants/index.js';
import { envs } from '../../../envs/index.js';
import { getSocialAuthRedirectURL } from '../../../utils/index.js';
import { ApiRequest } from '../ApiRequest.js';

export class Linkedin extends ApiRequest {
  private readonly routes = OAUTH_API_ROUTES_AND_METHODS.linkedin;

  public url() {
    const redirectUri = encodeURIComponent(getSocialAuthRedirectURL(AUTH_PROVIDER_MAP.LINKEDIN));
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
