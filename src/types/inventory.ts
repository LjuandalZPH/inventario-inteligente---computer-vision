export interface Detection {
  item: string;
  cantidad: number;
}

export interface InventoryScan {
  id: string;
  fecha: string;
  urlImagen: string;
  detecciones: Detection[];
  warehouseSummary: string;
}

// Custom mock data based on the requested specification, using our generated high-fidelity asset
export const MOCK_SCANS: InventoryScan[] = [
  {
    id: "scan-001",
    fecha: "2026-07-13",
    urlImagen: "mock_warehouse_asset", // Dynamically resolved to our generated asset in code
    detecciones: [
      { item: "cajas", cantidad: 30 },
      { item: "botellas", cantidad: 10 },
      { item: "laptops", cantidad: 8 },
      { item: "herramientas", cantidad: 5 }
    ],
    warehouseSummary: "Almacén con alta densidad de stock. Cajas estibadas correctamente en zona norte."
  }
];
