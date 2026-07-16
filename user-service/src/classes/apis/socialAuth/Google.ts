import { AUTH_PROVIDER_MAP, HEADERS_MAP } from '@beautinique/shared-constants';
import { OAuth2Client } from 'google-auth-library';

import { OAUTH_API_ROUTES_AND_METHODS } from '../../../constants/index.js';
import { envs } from '../../../envs/index.js';
import { getSocialAuthRedirectURL } from '../../../utils/index.js';
import { ApiRequest } from '../ApiRequest.js';

export class Google extends ApiRequest {
  private readonly routes = OAUTH_API_ROUTES_AND_METHODS.google;
  private readonly REDIRECT_URI = getSocialAuthRedirectURL(AUTH_PROVIDER_MAP.GOOGLE);

  private getClient() {
    return new OAuth2Client(
      envs.oAuth.google.client_id,
      envs.oAuth.google.client_secret,
      this.REDIRECT_URI,
    );
  }

  public url() {
    const client = this.getClient();

    return client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        `${OAUTH_API_ROUTES_AND_METHODS.google.decode.baseURL}/auth/userinfo.profile`,
        `${OAUTH_API_ROUTES_AND_METHODS.google.decode.baseURL}/auth/userinfo.email`,
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
