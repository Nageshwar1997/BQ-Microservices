import { AUTH_PROVIDER_MAP, HEADERS_MAP } from '@beautinique/shared-constants';

import { OAUTH_API_ROUTES_AND_METHODS } from '../../../constants/index.js';
import { envs } from '../../../envs/index.js';
import type { ILinkedinProfile } from '../../../types/index.js';
import { getSocialAuthRedirectURL } from '../../../utils/index.js';
import { ApiRequest } from '../ApiRequest.js';

export class Linkedin extends ApiRequest {
  private readonly routes = OAUTH_API_ROUTES_AND_METHODS.linkedin;
  private readonly REDIRECT_URI = getSocialAuthRedirectURL(AUTH_PROVIDER_MAP.LINKEDIN);

  public url() {
    const redirectUri = encodeURIComponent(this.REDIRECT_URI);
    const client_id = envs.oAuth.linkedin.client_id;
    return `${OAUTH_API_ROUTES_AND_METHODS.linkedin.access_token.baseURL}/oauth/v2/authorization?response_type=code&client_id=${client_id}&redirect_uri=${redirectUri}&scope=openid%20profile%20email`;
  }

  public access_token(code: string) {
    return this.request<{ access_token: string }>({
      ...this.routes.access_token,
      data: {
        grant_type: 'authorization_code',
        code,
        redirect_uri: this.REDIRECT_URI,
        client_id: envs.oAuth.linkedin.client_id,
        client_secret: envs.oAuth.linkedin.client_secret,
      },
      headers: { [HEADERS_MAP.contentType]: 'application/x-www-form-urlencoded' },
    });
  }

  public decode(access_token: string) {
    return this.request<ILinkedinProfile>({
      ...this.routes.decode,
      headers: { [HEADERS_MAP.authorization]: `Bearer ${access_token}` },
    });
  }
}
