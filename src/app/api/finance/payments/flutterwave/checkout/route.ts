const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://studiischool-api.onrender.com";

export async function POST(request: Request) {
  const authorization = request.headers.get("authorization");
  const response = await fetch(`${API_URL}/finance/payments/flutterwave/checkout`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(authorization ? { Authorization: authorization } : {}),
    },
    body: await request.text(),
  });

  const data = await response.json().catch(() => null);
  return Response.json(data ?? {}, { status: response.status });
}
