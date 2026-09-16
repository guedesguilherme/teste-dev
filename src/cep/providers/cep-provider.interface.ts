import { CepResponseDto } from '../dto/cep-response.dto.js';

export const CEP_PROVIDERS = Symbol('CEP_PROVIDERS');

export interface CepProvider {
  readonly name: string;
  fetch(cep: string): Promise<CepResponseDto>;
}
