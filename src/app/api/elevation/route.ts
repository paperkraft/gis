import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const locations = searchParams.get("locations");

    if (!locations) {
        return NextResponse.json({ error: "Missing locations parameter" }, { status: 400 });
    }

    // API Endpoint (SRTM 30m dataset)
    // We forward the request from our server to theirs
    const externalUrl = `https://api.opentopodata.org/v1/srtm30m?locations=${locations}`;

    try {
        const response = await fetch(externalUrl);

        if (!response.ok) {
            return NextResponse.json(
                { error: `External API Error: ${response.statusText}` },
                { status: response.status }
            );
        }

        const data = await response.json();

        // Return the data to our client with CORS headers automatically handled by Next.js
        return NextResponse.json(data);

    } catch (error) {
        console.error("Elevation Proxy Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}