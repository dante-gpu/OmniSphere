import { z } from 'zod';

export const addLiquiditySchema = z.object({
  token1Amount: z
    .string()
    .min(1, 'Amount is required')
    .refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
      message: 'Amount must be greater than 0',
    }),
  token2Amount: z
    .string()
    .min(1, 'Amount is required')
    .refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
      message: 'Amount must be greater than 0',
    }),
  slippageTolerance: z
    .string()
    .refine((val) => !isNaN(Number(val)) && Number(val) >= 0.1 && Number(val) <= 5, {
      message: 'Slippage must be between 0.1% and 5%',
    }),
});

export const removeLiquiditySchema = z.object({
  percentage: z
    .number()
    .min(0, 'Percentage must be greater than 0')
    .max(100, 'Percentage cannot exceed 100'),
  slippageTolerance: z
    .string()
    .refine((val) => !isNaN(Number(val)) && Number(val) >= 0.1 && Number(val) <= 5, {
      message: 'Slippage must be between 0.1% and 5%',
    }),
});

export type AddLiquidityInput = z.infer<typeof addLiquiditySchema>;
export type RemoveLiquidityInput = z.infer<typeof removeLiquiditySchema>;