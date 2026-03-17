/*
  Warnings:

  - You are about to drop the column `coordenadas` on the `ordens_servico` table. All the data in the column will be lost.
  - You are about to drop the column `dataLimite` on the `ordens_servico` table. All the data in the column will be lost.
  - You are about to drop the column `localAtivo` on the `ordens_servico` table. All the data in the column will be lost.
  - You are about to drop the column `prazoContratual` on the `ordens_servico` table. All the data in the column will be lost.
  - You are about to drop the column `tag` on the `ordens_servico` table. All the data in the column will be lost.
  - You are about to drop the column `tipoManutencao` on the `ordens_servico` table. All the data in the column will be lost.
  - Added the required column `dataLimiteSLA` to the `ordens_servico` table without a default value. This is not possible if the table is not empty.
  - Added the required column `prazoSLAHoras` to the `ordens_servico` table without a default value. This is not possible if the table is not empty.
  - Added the required column `subsistema` to the `ordens_servico` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tipoAtividade` to the `ordens_servico` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "TipoAtividade" AS ENUM ('LUBRIFICACAO_ROLAMENTOS', 'FILTRO_SUCCAO_ASPERSAO', 'FILTRO_DUTO_FORNECIMENTO', 'INSPECAO_ALETAS_TROCADOR', 'MANUTENCAO_VENTILADOR_TORRE', 'VERIFICACAO_QUADRO_CONTROLE', 'INSPECAO_NIVEL_TANQUE_CONTAINER', 'INSPECAO_NIVEL_TANQUE_TORRE', 'REGISTRO_TEMPERATURA_PRESSAO', 'FILTRO_Y_REPOSICAO', 'INSPECAO_VAZAMENTOS_TUBULACAO', 'TESTE_PH_FLUIDO', 'INSPECAO_ELETRICA_QCP', 'DRENAGEM_TOPO_TORRE', 'SUBSTITUICAO_FLUIDO_REFRIGERANTE', 'INSPECAO_ANUAL_GERAL', 'FALHA_ENERGIA', 'FALHA_BOMBA_CIRCULACAO', 'FALHA_VENTILADOR_EXAUSTAO', 'FALHA_BOMBA_REPOSICAO', 'ALARME_VAZAMENTO', 'ALARME_ALTA_TEMPERATURA', 'ALARME_ALTA_PRESSAO', 'ALARME_BAIXA_PRESSAO', 'ALARME_BAIXA_VAZAO', 'ALARME_CONDENSACAO', 'FALHA_VEDACAO_BOMBA', 'FALHA_VENTILADOR_TORRE', 'SUBSTITUICAO_VALVULA_EXAUSTAO', 'SUBSTITUICAO_VENTILADOR_TORRE', 'OUTRO');

-- AlterTable
ALTER TABLE "ordens_servico" DROP COLUMN "coordenadas",
DROP COLUMN "dataLimite",
DROP COLUMN "localAtivo",
DROP COLUMN "prazoContratual",
DROP COLUMN "tag",
DROP COLUMN "tipoManutencao",
ADD COLUMN     "componenteTag" TEXT,
ADD COLUMN     "containerId" TEXT,
ADD COLUMN     "dataLimiteSLA" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "prazoSLAHoras" INTEGER NOT NULL,
ADD COLUMN     "subsistema" TEXT NOT NULL,
ADD COLUMN     "tipoAtividade" "TipoAtividade" NOT NULL;

-- DropEnum
DROP TYPE "TipoManutencao";
