import { AppError } from "./app-error";
import { ErrorCode } from "../codes/error-codes";

export class InvalidParametersError extends AppError {
  static defaultStatusCode = 400;

  constructor(message: string = "Invalid Parameters", statusCode?: number) {
    super(
      message,
      ErrorCode.INVALID_PARAMETERS,
      statusCode ?? InvalidParametersError.defaultStatusCode
    );
  }
}

