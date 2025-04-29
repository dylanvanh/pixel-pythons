import { AppError } from "./app-error";
import { ErrorCode } from "../codes/error-codes";

export class SigningFailedError extends AppError {
  static defaultStatusCode = 400;

  constructor(message: string = "Signing Failed", statusCode?: number) {
    super(
      message,
      ErrorCode.SIGNING_FAILED,
      statusCode ?? SigningFailedError.defaultStatusCode
    );
  }
}

