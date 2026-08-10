"use client";

import { AppError } from "./error/error-types/app-error";
import { isApiErrorResponse } from "./error/codes/error-codes";

const REQUEST_TIMEOUT_MS = 10_000;

export async function postInternalApi<
  ResponseData,
  RequestData = Record<string, unknown>,
>(url: string, data: RequestData): Promise<ResponseData> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const responseData: unknown = await response.json();

  if (!response.ok) {
    if (isApiErrorResponse(responseData)) {
      throw AppError.fromApiResponse(responseData);
    }
    throw new Error("Request failed");
  }

  return responseData as ResponseData;
}
