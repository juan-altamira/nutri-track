/**
 * Capitaliza la primera letra de un texto y convierte el resto a minúsculas
 * SOLO para visualización, NO modifica los datos en la base de datos
 * Ejemplo: "MILNASE" -> "Milnase"
 * @param text - Texto a capitalizar
 * @returns Texto capitalizado
 */
export function capitalize(text: string | null | undefined): string {
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

/**
 * Formatea un número con decimales
 * @param num - Número a formatear
 * @param decimals - Cantidad de decimales (default: 2)
 * @returns Número formateado
 */
export function formatNumber(num: number | null | undefined, decimals: number = 2): string {
  if (num === null || num === undefined) return '0';
  return num.toFixed(decimals);
}
