import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import MinersPageClient from "@/components/miners/miners-page-client";

export default async function MinersPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const db = prisma as any;
  const usuario = await db.usuario.findUnique({ where: { clerkId: userId } });
  if (!usuario) redirect("/sem-acesso");

  const [minerCount, asicAssets] = await Promise.all([
    db.minerInstance.count(),
    db.asset.findMany({
      where: { isAsicModel: true },
      select: { id: true, nome: true, codigo: true },
      orderBy: { nome: "asc" },
    }),
  ]);
  return (
    <MinersPageClient
      initialCount={minerCount}
      asicAssets={asicAssets}
      userCargo={usuario.cargo}
    />
  );
}