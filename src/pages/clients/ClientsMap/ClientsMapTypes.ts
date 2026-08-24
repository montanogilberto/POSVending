export interface ClientMapPoint {
  clientId: number;
  name: string;
  latitude: number;
  longitude: number;
  accuracyMeters?: number | null;
  capturedAt?: string;
}

export interface ClientsMapVM {
  loading: boolean;
  points: ClientMapPoint[];
  error: string | null;
  reload: () => void;
}
