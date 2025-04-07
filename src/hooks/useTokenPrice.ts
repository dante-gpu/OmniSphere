import { useState, useEffect } from 'react';

export function useTokenPrice(symbol: string) {
  const [price, setPrice] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchPrice = async () => {
      setLoading(true);
      try {
        // Here you would implement the actual price fetching logic
        // This is just a simulation
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Simulate different prices for different tokens
        const mockPrices: Record<string, number> = {
          SUI: 1.25,
          USDC: 1.00,
          SOL: 100.50,
          USDT: 1.00
        };
        
        setPrice(mockPrices[symbol] || 0);
      } catch (error) {
        console.error('Error fetching price:', error);
        setPrice(null);
      } finally {
        setLoading(false);
      }
    };

    fetchPrice();
  }, [symbol]);

  return { price, loading };
}