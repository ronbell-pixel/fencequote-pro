export async function GET(request: Request) {
  try {
    const address = new URL(request.url).searchParams.get("address")?.trim();
    if (!address)
      return Response.json(
        { error: "Enter a property address" },
        { status: 400 },
      );
    const url = new URL(
      "https://geocoding.geo.census.gov/geocoder/locations/onelineaddress",
    );
    url.searchParams.set("address", address);
    url.searchParams.set("benchmark", "Public_AR_Current");
    url.searchParams.set("format", "json");
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "FenceQuote-Pro/1.2",
      },
    });
    if (!response.ok)
      throw new Error("Address lookup is temporarily unavailable");
    const data = (await response.json()) as any,
      match = data?.result?.addressMatches?.[0];
    if (!match?.coordinates)
      return Response.json(
        {
          error:
            "We could not locate that U.S. address. Check the street, city, state, and ZIP.",
        },
        { status: 404 },
      );
    return Response.json(
      {
        lat: Number(match.coordinates.y),
        lng: Number(match.coordinates.x),
        matchedAddress: match.matchedAddress,
      },
      { headers: { "Cache-Control": "public, max-age=86400" } },
    );
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Address lookup failed",
      },
      { status: 502 },
    );
  }
}
