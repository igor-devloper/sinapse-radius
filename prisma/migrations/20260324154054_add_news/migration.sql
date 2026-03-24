/*
  Warnings:

  - You are about to drop the column `tipoAtividade` on the `ordens_servico` table. All the data in the column will be lost.
  - Added the required column `tipoOS` to the `ordens_servico` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "TipoOS" AS ENUM ('PREVENTIVA', 'CORRETIVA');

-- CreateEnum
CREATE TYPE "PeriodicidadePreventiva" AS ENUM ('DIARIA', 'SEMANAL', 'MENSAL', 'TRIMESTRAL', 'SEMESTRAL', 'ANUAL', 'HORAS_2000', 'BIENNIAL');

-- CreateEnum
CREATE TYPE "TipoAtividadeCorretiva" AS ENUM ('FALHA_ENERGIA', 'FALHA_BOMBA_CIRCULACAO', 'FALHA_VENTILADOR_EXAUSTAO', 'FALHA_BOMBA_REPOSICAO', 'ALARME_VAZAMENTO', 'ALARME_ALTA_TEMPERATURA', 'ALARME_ALTA_PRESSAO', 'ALARME_BAIXA_PRESSAO', 'ALARME_BAIXA_VAZAO', 'ALARME_CONDENSACAO', 'FALHA_VEDACAO_BOMBA', 'FALHA_VENTILADOR_TORRE', 'SUBSTITUICAO_VALVULA_EXAUSTAO', 'SUBSTITUICAO_VENTILADOR_TORRE', 'OUTRO');

-- AlterTable
ALTER TABLE "ordens_servico" DROP COLUMN "tipoAtividade",
ADD COLUMN     "periodicidadePreventiva" "PeriodicidadePreventiva",
ADD COLUMN     "tipoAtividadeCorretiva" "TipoAtividadeCorretiva",
ADD COLUMN     "tipoOS" "TipoOS" NOT NULL,
ALTER COLUMN "dataEmissaoAxia" DROP NOT NULL,
ALTER COLUMN "dataLimiteSLA" DROP NOT NULL,
ALTER COLUMN "prazoSLAHoras" DROP NOT NULL;

-- DropEnum
DROP TYPE "TipoAtividade";
