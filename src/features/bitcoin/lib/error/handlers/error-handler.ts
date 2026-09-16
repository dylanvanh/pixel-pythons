import { toast } from "sonner";

export function handleError(error: unknown, fallbackMessage: string = "Operation failed"): void {
  if (error instanceof Error) {
    toast.error(error.message);
    return;
  }

  toast.error(fallbackMessage);
}
