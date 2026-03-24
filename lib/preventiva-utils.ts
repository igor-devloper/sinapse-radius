export function calcularProximaData(
  dataBase: Date,
  periodicidade: string
): Date | null {
  const d = new Date(dataBase);

  switch (periodicidade) {
    case "SEMANAL":
      d.setDate(d.getDate() + 7);
      return d;

    case "MENSAL":
      d.setMonth(d.getMonth() + 1);
      return d;

    case "TRIMESTRAL":
      d.setMonth(d.getMonth() + 3);
      return d;

    case "SEMESTRAL":
      d.setMonth(d.getMonth() + 6);
      return d;

    case "ANUAL":
      d.setFullYear(d.getFullYear() + 1);
      return d;

    case "BIENNIAL":
      d.setFullYear(d.getFullYear() + 2);
      return d;

    case "HORAS_2000":
      return null; // depende de horas, não data

    default:
      return null;
  }
}