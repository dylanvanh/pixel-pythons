export enum ErrorCode {
  INSUFFICIENT_FUNDS = "INSUFFICIENT_FUNDS",
  INVALID_PARAMETERS = "INVALID_PARAMETERS",
  OPERATION_FAILED = "OPERATION_FAILED",
  NETWORK_ERROR = "NETWORK_ERROR",
  SIGNING_FAILED = "SIGNING_FAILED",
  BROADCAST_FAILED = "BROADCAST_FAILED",
}

export interface ApiErrorResponse {
  code: ErrorCode;
  error: string;
  details?: string;
}

export function createApiError(
  code: ErrorCode,
  message: string,
  details?: string,
): ApiErrorResponse {
  console.error(code, message, details);
  return { code, error: message, details };
}

export function isApiErrorResponse(obj: unknown): obj is ApiErrorResponse {
  return (
    obj !== null &&
    typeof obj === "object" &&
    "code" in obj &&
    "error" in obj &&
    typeof (obj as ApiErrorResponse).error === "string" &&
    Object.values(ErrorCode).includes((obj as ApiErrorResponse).code)
  );
}
