import { PipeTransform, Injectable } from '@nestjs/common';
import { CepInvalidError } from '../errors/cep.errors.js';

export function normalizeCep(raw: string): string {
  return raw.replace(/[-\s]/g, '');
}

@Injectable()
export class CepValidationPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    const cep = normalizeCep(value);

    if (!/^\d{8}$/.test(cep)) {
      throw new CepInvalidError(value);
    }

    return cep;
  }
}
