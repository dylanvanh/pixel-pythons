import { AppError } from "../error-types/app-error";
import { ErrorCode, createApiError } from "../codes/error-codes";

type ApiHandler = (request: Request) => Promise<Response>;

export function withErrorHandling(handler: ApiHandler): ApiHandler {
  return async (request: Request) => {
    try {
      return await handler(request);
    } catch (error) {
      console.error("API Error:", error);
      const failure = classifyError(error);
      return Response.json(createApiError(failure.code, failure.title, failure.details), {
        status: failure.status,
      });
    }
  };
}

function classifyError(error: unknown) {
  if (error instanceof AppError) {
    return {
      code: error.code,
      title: error.name,
      details: error.message,
      status: error.statusCode,
    };
  }

  const details = error instanceof Error ? error.message : "Unknown error";
  const normalizedDetails = details.toLowerCase();
  if (
    normalizedDetails.includes("missing required parameters") ||
    normalizedDetails.includes("invalid parameters")
  ) {
    return {
      code: ErrorCode.INVALID_PARAMETERS,
      title: "Invalid Request",
      details,
      status: 400,
    };
  }

  if (["network", "timeout", "connection"].some((term) => normalizedDetails.includes(term))) {
    return {
      code: ErrorCode.NETWORK_ERROR,
      title: "Network Error",
      details,
      status: 503,
    };
  }

  if (["signing", "signature"].some((term) => normalizedDetails.includes(term))) {
    return {
      code: ErrorCode.SIGNING_FAILED,
      title: "Transaction Signing Failed",
      details,
      status: 400,
    };
  }

  return {
    code: ErrorCode.OPERATION_FAILED,
    title: "Operation Failed",
    details: "Oops something went wrong",
    status: 500,
  };
}
