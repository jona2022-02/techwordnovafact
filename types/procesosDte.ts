// types/procesosDte.ts
export interface ProcesoDTE {
  id: string;
  userId: string;
  userEmail: string;
  fechaHora: Date;
  cantidadArchivos: number;
  cantidadResultados: number;
  tipoVerificacion: 'CSV' | 'JSON' | 'CODIGO_FECHA';
  archivos: string[]; // nombres de archivos
  resultados: {
    emitidos: number;
    anulados: number;
    rechazados: number;
    invalidados: number;
    errores: number;
  };
  duracionMs: number;
  exito: boolean;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CrearProcesoDTO {
  cantidadArchivos: number;
  cantidadResultados: number;
  tipoVerificacion: 'CSV' | 'JSON' | 'CODIGO_FECHA';
  archivos: string[];
  resultados: {
    emitidos: number;
    anulados: number;
    rechazados: number;
    invalidados: number;
    errores: number;
  };
  duracionMs: number;
  exito: boolean;
  errorMessage?: string;
}