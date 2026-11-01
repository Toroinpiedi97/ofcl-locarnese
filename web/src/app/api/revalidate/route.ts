import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";

export async function POST(req: NextRequest) {
  const secret = process.env.REVALIDATE_SECRET;
  const authHeader = req.headers.get("authorization");

  if (!secret) {
    return NextResponse.json(
      {
        error: "REVALIDATE_SECRET non configurato sull'istanza server.",
      },
      { status: 500 }
    );
  }

  const token = authHeader?.startsWith("Bearer ") ? authHeader.substring(7).trim() : null;

  if (!token || token !== secret) {
    return NextResponse.json(
      {
        error: "Non autorizzato: token Bearer mancante o non corrispondente.",
      },
      { status: 401 }
    );
  }

  try {
    let body: { tag?: string; path?: string } = {};
    try {
      body = await req.json();
    } catch {
      // Body vuoto o non JSON: revalidazione globale di default
    }

    if (body.tag) {
      revalidateTag(body.tag, "max");
    }

    if (body.path) {
      revalidatePath(body.path);
    }

    // Se non sono specificati né tag né path, revalida le pagine pubbliche chiave
    if (!body.tag && !body.path) {
      revalidatePath("/");
      revalidatePath("/comuni");
      revalidatePath("/crediti");
      revalidatePath("/documenti");
      revalidatePath("/open-data");
      revalidateTag("mca2-data", "max");
    }

    return NextResponse.json({
      revalidated: true,
      timestamp: new Date().toISOString(),
      details: {
        tag: body.tag || "mca2-data",
        path: body.path || "all-core-paths",
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Errore sconosciuto";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
