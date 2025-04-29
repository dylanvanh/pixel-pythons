import { AppError } from "./app-error";
import { ErrorCode } from "../codes/error-codes";

export class BroadcastFailedError extends AppError {
  static defaultStatusCode = 500;

  constructor(
    message: string = "Transaction failed to broadcast",
    statusCode?: number,
  ) {
    super(
      message,
      ErrorCode.BROADCAST_FAILED,
      statusCode ?? BroadcastFailedError.defaultStatusCode,
    );
  }
}
