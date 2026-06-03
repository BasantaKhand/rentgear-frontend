// Derives a user-friendly message from an axios error.
// Distinguishes a "no response" (server down / CORS blocked / network) case
// from an actual API error response.
export function getErrorMessage(err, fallback = 'Something went wrong. Please try again.') {
  if (!err.response) {
    return 'Cannot reach the server. Please make sure it is running and try again.';
  }
  const data = err.response.data;
  return data?.message || data?.errors?.[0]?.message || fallback;
}
