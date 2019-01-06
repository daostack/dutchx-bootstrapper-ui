import { Erc20Wrapper, LockingToken4ReputationWrapper } from '@daostack/arc.js';
import { AureliaConfiguration } from 'aurelia-configuration';
import { BigNumber } from 'bignumber.js';
import { Address, LockerInfo, LockInfo, Locking4ReputationWrapper } from 'services/ArcService';

export class LockService {
  private static lockableTokens: Map<Address, ITokenSpecification> = new Map<Address, ITokenSpecification>();

  public lockableTokenSpecs: Array<ITokenSpecification>;

  constructor(
      appConfig: AureliaConfiguration
    , private wrapper: Locking4ReputationWrapper
    , private userAddress: Address,
  ) {
    this.lockableTokenSpecs = appConfig.get('lockableTokens');
  }

  public async getUserLocks(): Promise<Array<LockInfo>> {

    const fetcher = (await this.wrapper.getLocks())(
      { _locker: this.userAddress },
      { fromBlock: 0 });

    return fetcher.get();
  }

  public async getUserLockedTokens(): Promise<Array<Erc20Wrapper>> {
    const locks = await this.getUserLocks();
    const tokens = new Array<Erc20Wrapper>();
    const tokenWrapper = (this.wrapper as LockingToken4ReputationWrapper);
    for (const lock of locks) {
      const token = await tokenWrapper.getTokenForLock(lock.lockId);
      tokens.push(token);
    }
    return tokens;
  }

  public async getUserTotalLockedAmount(): Promise<BigNumber> {
    const locks = await this.getUserLocks();
    let amount = new BigNumber(0);
    for (const lock of locks) {
      amount = amount.add(lock.amount);
    }
    return amount;
  }

  public async getLockedTokenSymbol(lockInfo: LockInfo): Promise<string> {
    const spec = await this.getLockedTokenSpec(lockInfo);
    return spec.symbol;
  }

  private async getLockedTokenSpec(lockInfo: LockInfo): Promise<ITokenSpecification> {
    let spec = LockService.lockableTokens.get(lockInfo.lockId);

    if (!spec) {
      const tokenWrapper = (this.wrapper as LockingToken4ReputationWrapper);
      const token = await tokenWrapper.getTokenForLock(lockInfo.lockId);
      const foundTokenSpecs = this.lockableTokenSpecs.filter((tokenSpec: ITokenSpecification) => {
        return tokenSpec.address.toLowerCase() === token.address;
      });
      if (foundTokenSpecs.length >= 1) {
        spec = foundTokenSpecs[0];
      } else {
        spec = { address: null, symbol: 'N/A' };
      }

      LockService.lockableTokens.set(lockInfo.lockId, spec);
    }
    return spec;
  }
}

export interface ITokenSpecification {
  symbol: string;
  address: Address;
}
