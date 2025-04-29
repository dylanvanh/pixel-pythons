"use client";

import axios, { AxiosInstance, AxiosRequestConfig } from "axios";
import { AppError } from "./error/error-types/app-error";
import { ErrorCode, isApiErrorResponse } from "./error/codes/error-codes";
import { InsufficientFundsError } from "./error/error-types/insufficient-funds-error";
import { InvalidParametersError } from "./error/error-types/invalid-parameters-error";
import { NetworkError } from "./error/error-types/network-error";
import { SigningFailedError } from "./error/error-types/signing-failed-error";
import { OperationFailedError } from "./error/error-types/transaction-failed-error";

/**
 * Client for making API requests to internal Next.js API routes
 */
class InternalApiClient {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: "", // relative path
      timeout: 10000,
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Response interceptor for error handling
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response && error.response.data) {
          const errorData = error.response.data;

          // Check if it's an API error response
          if (isApiErrorResponse(errorData)) {
            const message =
              errorData.details || errorData.error || "Unknown error";

            // Create appropriate error type based on code
            switch (errorData.code) {
              case ErrorCode.INSUFFICIENT_FUNDS:
                throw new InsufficientFundsError(message);
              case ErrorCode.INVALID_PARAMETERS:
                throw new InvalidParametersError(message);
              case ErrorCode.OPERATION_FAILED:
                throw new OperationFailedError(message);
              case ErrorCode.NETWORK_ERROR:
                throw new NetworkError(message);
              case ErrorCode.SIGNING_FAILED:
                throw new SigningFailedError(message);
              default:
                throw new AppError(message, errorData.code);
            }
          }

          // Default error
          throw new Error(
            errorData.details || errorData.error || "Request failed",
          );
        }

        // Network errors or other non-response errors
        throw error;
      },
    );
  }

  /**
   * Make a GET request to an internal API endpoint
   */
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response = await this.api.get<T>(url, config);
      return response.data;
    } catch (error) {
      this.logError(error);
      throw error;
    }
  }

  /**
   * Make a POST request to an internal API endpoint
   */
  async post<T, D = Record<string, unknown>>(
    url: string,
    data?: D,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    try {
      const response = await this.api.post<T>(url, data, config);
      return response.data;
    } catch (error) {
      this.logError(error);
      throw error;
    }
  }

  /**
   * Error logging helper
   */
  private logError(error: unknown): void {
    console.error("API request failed:", error);
  }
}

export const internalApi = new InternalApiClient();