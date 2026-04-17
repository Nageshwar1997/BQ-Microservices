export type TFieldErrors = Record<string, string[]>;

export class ApiError extends Error {
  fieldErrors?: TFieldErrors;
  globalErrors?: string[];
  statusCode: number;

  constructor(params: { message: string; fieldErrors?: TFieldErrors; globalErrors?: string[]; statusCode: number }) {
    super(params.message);

    this.fieldErrors = params.fieldErrors;
    this.globalErrors = params.globalErrors;
    this.statusCode = params.statusCode ?? 500;
  }
}
