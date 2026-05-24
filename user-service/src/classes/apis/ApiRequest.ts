import { AppError, type AppSuccess } from '@beautinique/be-classes';
import axios, { AxiosError, type AxiosInstance, type AxiosRequestConfig } from 'axios';

export class ApiRequest {
  private readonly instance: AxiosInstance;

  constructor(baseURL?: string) {
    this.instance = axios.create({ baseURL });
  }

  protected async request(config: AxiosRequestConfig) {
    try {
      const { data } = await this.instance.request(config);
      return data as AppSuccess;
    } catch (error) {
      if (error instanceof AxiosError) {
        const message = error.response?.data?.message || 'API Error occurred';
        const globalErrors = error.response?.data?.globalErrors;
        const fieldErrors = error.response?.data?.fieldErrors;
        const statusCode = error.response?.status || error.response?.data?.statusCode || 500;
        const code = error.response?.data?.code;
        throw new AppError({ message, globalErrors, fieldErrors, statusCode, code });
      }
      throw new AppError({
        message: error instanceof Error ? error.message : 'Something went wrong!',
        code: 'INTERNAL_SERVER_ERROR',
      });
    }
  }
}
