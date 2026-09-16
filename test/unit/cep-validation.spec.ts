import { CepValidationPipe, normalizeCep } from '../../src/cep/dto/cep-param.dto.js';
import { CepInvalidError } from '../../src/cep/errors/cep.errors.js';

describe('normalizeCep', () => {
  it('should strip hyphens', () => {
    expect(normalizeCep('01310-100')).toBe('01310100');
  });

  it('should strip spaces', () => {
    expect(normalizeCep('01310 100')).toBe('01310100');
  });

  it('should return clean cep unchanged', () => {
    expect(normalizeCep('01310100')).toBe('01310100');
  });
});

describe('CepValidationPipe', () => {
  const pipe = new CepValidationPipe();

  it('should accept valid 8-digit CEP', () => {
    expect(pipe.transform('01310100')).toBe('01310100');
  });

  it('should accept hyphenated CEP and normalize', () => {
    expect(pipe.transform('01310-100')).toBe('01310100');
  });

  it('should reject CEP with letters', () => {
    expect(() => pipe.transform('0131010a')).toThrow(CepInvalidError);
  });

  it('should reject CEP too short', () => {
    expect(() => pipe.transform('1234567')).toThrow(CepInvalidError);
  });

  it('should reject CEP too long', () => {
    expect(() => pipe.transform('123456789')).toThrow(CepInvalidError);
  });

  it('should reject empty string', () => {
    expect(() => pipe.transform('')).toThrow(CepInvalidError);
  });
});
