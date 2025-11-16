export interface TankWaterDetail {
  tankWatersDetailId: number;
  quantityLiters: number;
  createdAt: string;
}

export interface TankCurrent {
  quantityLiters: number;
  percent: number;
  sampledAt: string;
}

export interface WaterTank {
  tankWaterId: number;
  name: string;
  capacityLiters: number;
  device: string;
  current: TankCurrent;
  history: TankWaterDetail[];
  tankMeta: object;
}

export interface WaterTanksResponse {
  waterTanks: WaterTank[];
}

export const fetchWaterTanks = async (): Promise<WaterTanksResponse> => {
  const response = await fetch('https://smartloansbackend.azurewebsites.net/all_tankWaters');
  if (!response.ok) {
    throw new Error(`Failed to fetch water tanks: ${response.status}`);
  }
  return response.json();
};
