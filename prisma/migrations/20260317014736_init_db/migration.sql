-- CreateEnum
CREATE TYPE "PrioridadeOS" AS ENUM ('CRITICA', 'ALTA', 'MEDIA', 'BAIXA');

-- CreateEnum
CREATE TYPE "TipoManutencao" AS ENUM ('CORRETIVA', 'PREVENTIVA', 'PREDITIVA', 'EMERGENCIAL');

-- CreateEnum
CREATE TYPE "Cargo" AS ENUM ('ADMIN', 'SUPERVISOR', 'TECNICO', 'VISUALIZADOR');

-- CreateEnum
CREATE TYPE "StatusOS" AS ENUM ('ABERTA', 'EM_ANDAMENTO', 'AGUARDANDO_PECA', 'PAUSADA', 'CONCLUIDA', 'CANCELADA');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "clerkId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "cargo" "Cargo" NOT NULL DEFAULT 'VISUALIZADOR',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "avatarUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ordens_servico" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "motivoOS" TEXT NOT NULL,
    "tipoManutencao" "TipoManutencao" NOT NULL,
    "status" "StatusOS" NOT NULL DEFAULT 'ABERTA',
    "prioridade" "PrioridadeOS" NOT NULL DEFAULT 'MEDIA',
    "dataEmissaoAxia" TIMESTAMP(3) NOT NULL,
    "prazoContratual" INTEGER NOT NULL DEFAULT 24,
    "dataLimite" TIMESTAMP(3) NOT NULL,
    "slaVencido" BOOLEAN NOT NULL DEFAULT false,
    "dataProgramada" TIMESTAMP(3),
    "dataInicio" TIMESTAMP(3),
    "dataConclusao" TIMESTAMP(3),
    "localAtivo" TEXT NOT NULL,
    "tag" TEXT,
    "coordenadas" TEXT,
    "responsavelId" TEXT,
    "abertoPorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ordens_servico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "historico_os" (
    "id" TEXT NOT NULL,
    "osId" TEXT NOT NULL,
    "statusDe" "StatusOS",
    "statusPara" "StatusOS" NOT NULL,
    "observacao" TEXT,
    "usuarioId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "historico_os_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comentarios" (
    "id" TEXT NOT NULL,
    "osId" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "comentarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "anexos" (
    "id" TEXT NOT NULL,
    "osId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "tamanho" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "anexos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_clerkId_key" ON "usuarios"("clerkId");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "ordens_servico_numero_key" ON "ordens_servico"("numero");

-- AddForeignKey
ALTER TABLE "ordens_servico" ADD CONSTRAINT "ordens_servico_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordens_servico" ADD CONSTRAINT "ordens_servico_abertoPorId_fkey" FOREIGN KEY ("abertoPorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historico_os" ADD CONSTRAINT "historico_os_osId_fkey" FOREIGN KEY ("osId") REFERENCES "ordens_servico"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historico_os" ADD CONSTRAINT "historico_os_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comentarios" ADD CONSTRAINT "comentarios_osId_fkey" FOREIGN KEY ("osId") REFERENCES "ordens_servico"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comentarios" ADD CONSTRAINT "comentarios_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anexos" ADD CONSTRAINT "anexos_osId_fkey" FOREIGN KEY ("osId") REFERENCES "ordens_servico"("id") ON DELETE CASCADE ON UPDATE CASCADE;
