// This file provides compatibility exports for ethers v5 utilities,
// making them available for modules that might expect them at the top level.
// Since the project uses ethers v5, we directly export from ethers.utils.

import { utils, BytesLike as EthersBytesLike } from 'ethers'; // Import utils and BytesLike type

// Export required utility functions directly from ethers.utils
export const id = utils.id;
export const keccak256 = utils.keccak256;
export const sha256 = utils.sha256;
export const toUtf8Bytes = utils.toUtf8Bytes;
export const hexValue = utils.hexValue;
export const hexZeroPad = utils.hexZeroPad;
export const stripZeros = utils.stripZeros;
export const isBytes = utils.isBytes;
export const arrayify = utils.arrayify;
export const zeroPad = utils.zeroPad;
export const hexlify = utils.hexlify;
export const zeroPadValue = utils.hexZeroPad; // hexZeroPad is the v5 equivalent
export const stripZerosLeft = utils.stripZeros; // stripZeros is the v5 equivalent
export const isBytesLike = utils.isBytesLike; // isBytesLike exists in v5 utils
export const toBeHex = utils.hexlify; // hexlify is closer in v5
export const zeroPadBytes = utils.zeroPad; // zeroPad is the v5 equivalent

// Export the BytesLike type
export type BytesLike = EthersBytesLike;

// NOTE: This file now correctly exports v5 utilities.
// Any code importing from here will get the actual v5 functions.
