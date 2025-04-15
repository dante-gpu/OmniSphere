// This file acts as a shim to provide compatibility for modules
// expecting ethers v6 exports, while the project uses ethers v5.

import { utils } from 'ethers';

// Re-export parseUnits and formatUnits from ethers.utils
export const parseUnits = utils.parseUnits;
export const formatUnits = utils.formatUnits;
