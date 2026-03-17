import { Webhook } from "svix";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type ClerkEvent = {
  type: string;
  data: {
    id: string;
    email_addresses: { email_address: string; id: string }[];
    first_name: string | null;
    last_name: string | null;
    image_url: string | null;
  };
};

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
  if (!WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Webhook secret não configurado" }, { status: 500 });
  }

  const headerPayload = await headers();
  const svixId = headerPayload.get("svix-id");
  const svixTimestamp = headerPayload.get("svix-timestamp");
  const svixSignature = headerPayload.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: "Headers inválidos" }, { status: 400 });
  }

  const payload = await req.json();
  const body = JSON.stringify(payload);

  const wh = new Webhook(WEBHOOK_SECRET);
  let evt: ClerkEvent;

  try {
    evt = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as ClerkEvent;
  } catch {
    return NextResponse.json({ error: "Assinatura inválida" }, { status: 400 });
  }

  const { type, data } = evt;

  if (type === "user.created") {
    const email = data.email_addresses[0]?.email_address ?? "";
    const nome = [data.first_name, data.last_name].filter(Boolean).join(" ") || email;

    await prisma.usuario.upsert({
      where: { clerkId: data.id },
      update: { nome, email, avatarUrl: data.image_url },
      create: {
        clerkId: data.id,
        nome,
        email,
        avatarUrl: data.image_url,
        cargo: "VISUALIZADOR", // cargo padrão — admin promove depois
      },
    });
  }

  if (type === "user.updated") {
    const email = data.email_addresses[0]?.email_address ?? "";
    const nome = [data.first_name, data.last_name].filter(Boolean).join(" ") || email;

    await prisma.usuario.updateMany({
      where: { clerkId: data.id },
      data: { nome, email, avatarUrl: data.image_url },
    });
  }

  if (type === "user.deleted") {
    await prisma.usuario.updateMany({
      where: { clerkId: data.id },
      data: { ativo: false },
    });
  }

  return NextResponse.json({ received: true });
}
