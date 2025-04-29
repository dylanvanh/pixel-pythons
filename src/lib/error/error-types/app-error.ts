import { ErrorCode, type ApiErrorResponse } from "../codes/error-codes";

export class AppError extends Error {
  code: ErrorCode;
  statusCode: number;

  constructor(message: string, code: ErrorCode, statusCode: number = 500) {
    super(message);
    this.code = code;
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  static fromApiResponse(errorData: ApiErrorResponse): AppError {
    const message = errorData.details || errorData.error || "Unknown error";

    return new AppError(message, errorData.code);
  }
}
