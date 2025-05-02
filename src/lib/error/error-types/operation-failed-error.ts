import { AppError } from "./app-error";
import { ErrorCode } from "../codes/error-codes";

export class OperationFailedError extends AppError {
  static defaultStatusCode = 500;

  constructor(message: string = "Transaction Failed", statusCode?: number) {
    super(
      message,
      ErrorCode.OPERATION_FAILED,
      statusCode ?? OperationFailedError.defaultStatusCode,
    );
  }
}
