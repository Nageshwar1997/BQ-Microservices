import axios, { AxiosError, type AxiosInstance, type AxiosRequestConfig } from 'axios';
import { AppError, type AppSuccess } from '@beautinique/be-classes';
import { API_ROUTES_AND_METHODS } from '@/constants';

export class ApiRequest {
  private instance: AxiosInstance;

  constructor(baseURL?: string) {
    this.instance = axios.create({ baseURL });
  }

  protected routes = API_ROUTES_AND_METHODS;
  protected request = async (config: AxiosRequestConfig) => {
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
      if (error instanceof Error) {
        throw new AppError({ message: error.message, statusCode: 500, code: 'INTERNAL_ERROR' });
      }
      throw new AppError({
        message: 'Something went wrong!',
        statusCode: 500,
        code: 'INTERNAL_ERROR',
      });
    }
  };
}
