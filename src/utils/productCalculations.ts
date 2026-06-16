import type { Product, CalculatedProduct } from '../types/product';
import { parsePrintTimeToHours } from './printTimeParser';

const ELECTRICITY_RATE = 7.1;
const PRINTER_POWER = 0.08; // kW (80W)

export function calculateProductMetrics(product: Product): CalculatedProduct {
  const decimalHours = parsePrintTimeToHours(product.print_time);
  
  const filamentCost = (product.filament_weight / 1000) * product.cost_per_kg;
  const electricityCost = decimalHours * PRINTER_POWER * ELECTRICITY_RATE;
  const totalCost = filamentCost + electricityCost;
  const profit = product.selling_price - totalCost;
  const maxPiecesPerDay = decimalHours > 0 ? Math.floor(24 / decimalHours) : 0;

  return {
    ...product,
    decimalHours: Number(decimalHours.toFixed(4)),
    filamentCost: Number(filamentCost.toFixed(2)),
    electricityCost: Number(electricityCost.toFixed(2)),
    totalCost: Number(totalCost.toFixed(2)),
    profit: Number(profit.toFixed(2)),
    maxPiecesPerDay
  };
}
