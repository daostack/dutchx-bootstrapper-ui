import BigNumber from 'bignumber.js';
import { NumberService } from '../../src/services/numberService';

/* tslint:disable:no-console */
describe('NumberService', () => {

  it('can use toFixedNumberString', () => {
    const numberService = new NumberService();
    expect(numberService).not.toBeNull();

    let result: string;

    result = numberService.toFixedNumberString(new BigNumber('123.45'), 3);
    expect(result).toBe('123');

    result = numberService.toFixedNumberString(new BigNumber('123.45'), 5);
    expect(result).toBe('123.45');

    result = numberService.toFixedNumberString(new BigNumber('123.45'), 8);
    expect(result).toBe('123.45000');

    result = numberService.toFixedNumberString(new BigNumber('12345678901234'), 5);
    expect(result).toBe('1.2345e+13');

    result = numberService.toFixedNumberString(new BigNumber('.1234567890'), 5);
    expect(result).toBe('0.12345');

    result = numberService.toFixedNumberString(new BigNumber('.00678912345'), 8);
    expect(result).toBe('0.0067891234');

    result = numberService.toFixedNumberString(new BigNumber('.000678912345'), 8);
    expect(result).toBe('0.00067891234');

    result = numberService.toFixedNumberString(new BigNumber('.00000678912345'), 8);
    expect(result).toBe('0.0000067891234');

    result = numberService.toFixedNumberString(new BigNumber('.000000678912345'), 8);
    expect(result).toBe('6.7891234e-7');

    result = numberService.toFixedNumberString(new BigNumber('.0000000678912345'), 8);
    expect(result).toBe('6.7891234e-8');

    result = numberService.toFixedNumberString(new BigNumber('.00678912345'), 8, [-4, 20]);
    expect(result).toBe('0.0067891234');

    result = numberService.toFixedNumberString(new BigNumber('.000678912345'), 8, [-4, 20]);
    expect(result).toBe('6.7891234e-4');

    result = numberService.toFixedNumberString(new BigNumber('.0000678912345'), 8, [-4, 20]);
    expect(result).toBe('6.7891234e-5');

    result = numberService.toFixedNumberString(new BigNumber('.00000678912345'), 8, [-4, 20]);
    expect(result).toBe('6.7891234e-6');

    result = numberService.toFixedNumberString(new BigNumber('400000.00000678912345'), 8, [-4, 20]);
    expect(result).toBe('400000.00');
  });
});
