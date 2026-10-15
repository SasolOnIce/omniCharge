import { requireNativeModule } from 'expo';

type PosNfcNativeModule = {
  isHostCardEmulationAvailable(): boolean;
  setPaymentRequestId(requestId: string): boolean;
  clearPaymentRequestId(): void;
};

export default requireNativeModule<PosNfcNativeModule>('PosNfc');
