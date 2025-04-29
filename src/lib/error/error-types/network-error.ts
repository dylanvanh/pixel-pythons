import { AppError } from "./app-error";
import { ErrorCode } from "../codes/error-codes";

export class NetworkError extends AppError {
  static defaultStatusCode = 503;

  constructor(message: string = "Network Error", statusCode?: number) {
    super(
      message,
      ErrorCode.NETWORK_ERROR,
      statusCode ?? NetworkError.defaultStatusCode,
    );
  }
}
