CREATE TABLE "topicos_corretiva_os" (
    "id" TEXT NOT NULL,
    "osId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "observacao" TEXT,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "topicos_corretiva_os_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "anexos_topicos_corretiva_os" (
    "id" TEXT NOT NULL,
    "topicoId" TEXT NOT NULL,
    "osId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "tamanho" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "anexos_topicos_corretiva_os_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "topicos_corretiva_os_osId_ordem_idx" ON "topicos_corretiva_os"("osId", "ordem");
CREATE INDEX "anexos_topicos_corretiva_os_topicoId_idx" ON "anexos_topicos_corretiva_os"("topicoId");
CREATE INDEX "anexos_topicos_corretiva_os_osId_idx" ON "anexos_topicos_corretiva_os"("osId");

ALTER TABLE "topicos_corretiva_os"
ADD CONSTRAINT "topicos_corretiva_os_osId_fkey"
FOREIGN KEY ("osId") REFERENCES "ordens_servico"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "anexos_topicos_corretiva_os"
ADD CONSTRAINT "anexos_topicos_corretiva_os_topicoId_fkey"
FOREIGN KEY ("topicoId") REFERENCES "topicos_corretiva_os"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "anexos_topicos_corretiva_os"
ADD CONSTRAINT "anexos_topicos_corretiva_os_osId_fkey"
FOREIGN KEY ("osId") REFERENCES "ordens_servico"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
