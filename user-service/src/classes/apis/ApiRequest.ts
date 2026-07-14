import type { TErrorCode } from '@beautinique/backend-classes';
import { AppError } from '@beautinique/be-classes';
import axios, {
  AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
} from 'axios';

interface ErrorResponse {
  message: string;
  statusCode?: number;
  code?: string;
  globalErrors?: string[];
  fieldErrors?: Record<string, string[]>;
}

export class ApiRequest {
  private readonly instance: AxiosInstance;

  constructor(baseURL?: string) {
    this.instance = axios.create({ baseURL });
  }

  protected async request<T = unknown>(config: AxiosRequestConfig) {
    try {
      const response = await this.instance.request(config);
      return response.data as T;
    } catch (error) {
      if (error instanceof AxiosError) {
        const errResp: AxiosResponse<ErrorResponse> | undefined = error.response;

        const message = errResp?.data.message ?? 'API Error occurred';
        const globalErrors = errResp?.data.globalErrors;
        const fieldErrors = errResp?.data.fieldErrors;
        const statusCode = errResp?.status ?? errResp?.data.statusCode ?? 500;
        const code = (errResp?.data.code ?? 'INTERNAL_SERVER_ERROR') as TErrorCode;

        throw new AppError({
          message,
          globalErrors,
          fieldErrors,
          statusCode,
          code,
        });
      }

      throw new AppError({
        message: error instanceof Error ? error.message : 'Something went wrong!',
        code: 'INTERNAL_SERVER_ERROR',
      });
    }
  }
}
