export interface ConfigRecord {
  id: number;
  printerIp: string;
  printerPort: number;
  serverPort: number;
  apiKey: string;
  updatedAt: Date;
}

export interface PrintJobRecord {
  id: number;
  createdAt: Date;
  status: string;
  source: string | null;
  zplPreview: string | null;
  bytesSent: number;
  errorMessage: string | null;
  printerIp: string | null;
}

export interface NewPrintJobInput {
  status: string;
  source: string | null;
  zplPreview: string | null;
  bytesSent: number;
  errorMessage: string | null;
  printerIp: string | null;
}

export interface ConfigPatch {
  printerIp?: string;
  printerPort?: number;
  serverPort?: number;
  apiKey?: string;
}

export interface ConfigDefaults {
  printerIp: string;
  printerPort: number;
  serverPort: number;
  apiKey: string;
}

export interface LogStatsRecord {
  totalJobs: number;
  successCount: number;
  failedCount: number;
  last24hCount: number;
  lastJobAt: Date | null;
}

export interface Storage {
  getOrCreateConfig(defaults: ConfigDefaults): Promise<ConfigRecord>;
  updateConfig(patch: ConfigPatch): Promise<ConfigRecord>;
  insertPrintJob(input: NewPrintJobInput): Promise<PrintJobRecord>;
  listPrintJobs(limit: number): Promise<PrintJobRecord[]>;
  getLogStats(): Promise<LogStatsRecord>;
  clearPrintJobs(): Promise<number>;
}
