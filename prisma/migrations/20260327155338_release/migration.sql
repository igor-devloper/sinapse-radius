-- AlterTable
ALTER TABLE "ordens_servico" ADD COLUMN     "dataFimProgramada" TIMESTAMP(3),
ADD COLUMN     "periodicidadesSelecionadas" TEXT[] DEFAULT ARRAY[]::TEXT[];
