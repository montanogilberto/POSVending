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

export const startPeriodicWaterTanksUpdate = (callback: (data: WaterTanksResponse) => void) => {
  const fetchAndCallback = async () => {
    try {
      const data = await fetchWaterTanks();
      callback(data);
    } catch (error) {
      console.error('Error fetching water tanks:', error);
    }
  };

  // Initial fetch
  fetchAndCallback();

  // Set up periodic updates every hour (60 minutes * 60 seconds * 1000 ms)
  const intervalId = setInterval(fetchAndCallback, 60 * 60 * 1000);

  // Return cleanup function to stop the interval
  return () => clearInterval(intervalId);
};
