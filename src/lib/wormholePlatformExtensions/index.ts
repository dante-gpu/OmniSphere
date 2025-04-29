// /Users/dante/Desktop/reacthreejs/OmniSphere/src/lib/wormholePlatformExtensions/index.ts

// Tüm platform genişletmelerini tek bir dosyadan export eder

// Dosya modüllerini import et (Bu satırlar prototip genişletmelerini yükler)
import './solanaPools';
import './suiPools';
import './solanaPoolLinks';
import './suiPoolLinks';

// Yardımcı fonksiyonları yeniden export et (opsiyonel)
export * from './wormholeHelpers';

// Şimdi crossChainPoolManager.ts bu modülü import ettiğinde,
// tüm platform genişletmeleri otomatik olarak yüklenecektir
console.log("Wormhole platform extensions loaded via index file");