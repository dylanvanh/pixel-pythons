import { toast } from "sonner";
import { InsufficientFundsError } from "../error-types/insufficient-funds-error";
import { InvalidParametersError } from "../error-types/invalid-parameters-error";
import { NetworkError } from "../error-types/network-error";
import { SigningFailedError } from "../error-types/signing-failed-error";
import { OperationFailedError } from "../error-types/operation-failed-error";
import { BroadcastFailedError } from "../error-types/broadcast-failed-error";

export function handleError(
  error: unknown,
  fallbackMessage: string = "Operation failed",
): void {
  if (error instanceof InsufficientFundsError) {
    toast.error(error.message);
  } else if (error instanceof InvalidParametersError) {
    toast.error(error.message);
  } else if (error instanceof OperationFailedError) {
    toast.error(error.message);
  } else if (error instanceof BroadcastFailedError) {
    toast.error(error.message);
  } else if (error instanceof NetworkError) {
    toast.error(`Network error: ${error.message}`);
  } else if (error instanceof SigningFailedError) {
    toast.error(`Signing failed: ${error.message}`);
  } else if (error instanceof Error) {
    toast.error(error.message);
  } else {
    toast.error(fallbackMessage);
  }
}
