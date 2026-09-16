import { ApiProperty } from '@nestjs/swagger';

export class CepResponseDto {
  @ApiProperty({ example: '01310100' })
  cep: string;

  @ApiProperty({ example: 'Avenida Paulista' })
  street: string;

  @ApiProperty({ example: 'Bela Vista' })
  neighborhood: string;

  @ApiProperty({ example: 'São Paulo' })
  city: string;

  @ApiProperty({ example: 'SP' })
  state: string;

  @ApiProperty({ example: 'viacep', description: 'Provider que respondeu' })
  provider: string;

  @ApiProperty({ example: false })
  cached: boolean;
}
