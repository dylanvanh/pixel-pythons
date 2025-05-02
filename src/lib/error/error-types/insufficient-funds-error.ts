import { AppError } from "./app-error";
import { ErrorCode } from "../codes/error-codes";

export class InsufficientFundsError extends AppError {
  static defaultStatusCode = 400;

  constructor(message: string = "Insufficient Funds", statusCode?: number) {
    super(
      message,
      ErrorCode.INSUFFICIENT_FUNDS,
      statusCode ?? InsufficientFundsError.defaultStatusCode,
    );
  }
}
