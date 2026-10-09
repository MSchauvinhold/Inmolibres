// Calendario de ajustes de alquiler. Todo en UTC: fechaInicio y fechaUltimoAjuste
// vienen de columnas de fecha que Prisma entrega a medianoche UTC, y en hora local
// argentina un "1 de agosto" pasaba a ser 31 de julio (y cambiaba el mes).

export function diferenciaEnMesesUtc(desde: Date, hasta: Date): number {
  return (hasta.getUTCFullYear() - desde.getUTCFullYear()) * 12 + (hasta.getUTCMonth() - desde.getUTCMonth());
}

interface ContratoAjuste {
  fechaInicio: Date;
  fechaUltimoAjuste: Date | null;
  ajusteMeses: number;
  ajusteDia: number;
}

/**
 * Día en que corresponde el próximo ajuste: el `ajusteDia` del mes que cae `ajusteMeses`
 * después del último ajuste (o del inicio). Es el mismo día en que el cron lo genera.
 */
export function proximaFechaAjuste(c: ContratoAjuste): Date {
  const base = c.fechaUltimoAjuste ?? c.fechaInicio;
  const y = base.getUTCFullYear();
  const m = base.getUTCMonth() + c.ajusteMeses;
  const diasDelMes = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return new Date(Date.UTC(y, m, Math.min(c.ajusteDia, diasDelMes)));
}
