import { NextResponse } from "next/server";
import { AppError } from "../error-types/app-error";
import { ErrorCode, createApiError } from "../codes/error-codes";

type ApiHandler = (request: Request) => Promise<Response>;

/**
 * A middleware that wraps API handlers to catch and standardize error responses
 */
export function withErrorHandling(handler: ApiHandler): ApiHandler {
  return async (request: Request) => {
    try {
      return await handler(request);
    } catch (error) {
      console.error("API Error:", error);

      // Handle AppError subclasses directly
      if (error instanceof AppError) {
        return NextResponse.json(
          createApiError(error.code, error.name, error.message),
          { status: error.statusCode },
        );
      }

      // Handle generic errors by attempting to classify them
      if (error instanceof Error) {
        const errorMessage = error.message;

        // Try to classify by error message content
        if (
          errorMessage.includes("Missing required parameters") ||
          errorMessage.includes("Invalid parameters")
        ) {
          return NextResponse.json(
            createApiError(
              ErrorCode.INVALID_PARAMETERS,
              "Invalid Request",
              errorMessage,
            ),
            { status: 401 },
          );
        }

        if (
          errorMessage.includes("network") ||
          errorMessage.includes("Network") ||
          errorMessage.includes("timeout") ||
          errorMessage.includes("connection")
        ) {
          return NextResponse.json(
            createApiError(
              ErrorCode.NETWORK_ERROR,
              "Network Error",
              errorMessage,
            ),
            { status: 503 },
          );
        }

        if (
          errorMessage.includes("signing") ||
          errorMessage.includes("signature")
        ) {
          return NextResponse.json(
            createApiError(
              ErrorCode.SIGNING_FAILED,
              "Transaction Signing Failed",
              errorMessage,
            ),
            { status: 400 },
          );
        }
      }

      // Default error handling for truly unknown errors
      return NextResponse.json(
        createApiError(
          ErrorCode.OPERATION_FAILED,
          "Operation Failed",
          "Oops something went wrong",
        ),
        { status: 500 },
      );
    }
  };
}
