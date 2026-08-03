interface ApiErrorResponse {
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  };
}

const configuredApiUrl = import.meta.env.VITE_API_URL as string | undefined;

const API_BASE_URL = (configuredApiUrl ?? "http://localhost:5000").replace(
  /\/+$/,
  "",
);

export class ApiError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly details?: unknown;

  public constructor(
    status: number,
    code: string,
    message: string,
    details?: unknown,
  ) {
    super(message);

    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

async function parseResponseBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type");

  if (contentType?.includes("application/json")) {
    return response.json();
  }

  const text = await response.text();

  return text.length > 0 ? text : undefined;
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);

  headers.set("Accept", "application/json");

  if (typeof options.body === "string" && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
      credentials: "include",
    });
  } catch {
    throw new ApiError(0, "NETWORK_ERROR", "Could not connect to the server.");
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const body = await parseResponseBody(response);

  if (!response.ok) {
    const errorResponse = body as ApiErrorResponse | undefined;

    throw new ApiError(
      response.status,
      errorResponse?.error?.code ?? "REQUEST_FAILED",
      errorResponse?.error?.message ??
        `Request failed with status ${response.status}.`,
      errorResponse?.error?.details,
    );
  }

  return body as T;
}
