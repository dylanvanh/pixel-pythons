import { ErrorCode, type ApiErrorResponse } from "../codes/error-codes";

const STATUS_BY_CODE: Record<ErrorCode, number> = {
  [ErrorCode.INSUFFICIENT_FUNDS]: 400,
  [ErrorCode.INVALID_PARAMETERS]: 400,
  [ErrorCode.OPERATION_FAILED]: 500,
  [ErrorCode.NETWORK_ERROR]: 503,
  [ErrorCode.SIGNING_FAILED]: 400,
  [ErrorCode.BROADCAST_FAILED]: 500,
};

export class AppError extends Error {
  code: ErrorCode;
  statusCode: number;

  constructor(message: string, code: ErrorCode) {
    super(message);
    this.code = code;
    this.name = code;
    this.statusCode = STATUS_BY_CODE[code];
    Object.setPrototypeOf(this, new.target.prototype);
  }

  static fromApiResponse(errorData: ApiErrorResponse): AppError {
    return new AppError(errorData.details || errorData.error || "Unknown error", errorData.code);
  }
}
