import {
  createError,
  ERROR_CLASS_MAP,
  type IAppError,
  type TErrorCode,
} from '@beautinique/backend-classes';
import axios, {
  AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
} from 'axios';

import type { TApiResponse } from '../../types/index.js';

type TErrorResponse = Omit<IAppError, 'cause' | 'isOperational'>;

const isErrorCode = (code: string | undefined): code is TErrorCode =>
  !!code && code in ERROR_CLASS_MAP;

export class ApiRequest {
  private readonly instance: AxiosInstance;

  constructor(baseURL?: string) {
    this.instance = axios.create({ baseURL });
  }

  protected async request<T = TApiResponse>(config: AxiosRequestConfig) {
    try {
      const response = await this.instance.request(config);
      return response.data as T;
    } catch (error) {
      if (error instanceof AxiosError) {
        const errResp: AxiosResponse<TErrorResponse> | undefined = error.response;

        const message = errResp?.data.message ?? 'API Error occurred';
        const globalErrors = errResp?.data.globalErrors;
        const fieldErrors = errResp?.data.fieldErrors;
        const statusCode = errResp?.status ?? errResp?.data.statusCode ?? 500;
        const code = isErrorCode(errResp?.data.code) ? errResp.data.code : 'INTERNAL_SERVER_ERROR';

        throw createError({ message, payload: { code, statusCode, fieldErrors, globalErrors } });
      }

      throw createError({
        message: error instanceof Error ? error.message : 'Something went wrong!',
        payload: { code: 'INTERNAL_SERVER_ERROR' },
      });
    }
  }
}
