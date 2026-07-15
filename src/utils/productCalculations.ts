import type { Product, CalculatedProduct } from '../types/product';
import { parsePrintTimeToHours } from './printTimeParser';
import { useSettingsStore } from '../store/useSettingsStore';

export function calculateProductMetrics(product: Product): CalculatedProduct {
  const decimalHours = parsePrintTimeToHours(product.print_time);
  
  const { electricityRate, printerPower } = useSettingsStore.getState();

  const filamentCost = (product.filament_weight / 1000) * product.cost_per_kg;
  const rate = product.electricity_rate !== undefined && product.electricity_rate !== null
    ? product.electricity_rate
    : electricityRate;
  const electricityCost = decimalHours * printerPower * rate;
  const totalCost = filamentCost + electricityCost + (product.packaging_cost || 0) + (product.delivery_cost || 0);
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
