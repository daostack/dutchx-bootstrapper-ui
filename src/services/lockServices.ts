import {
  Erc20Wrapper,
  Hash,
  LockingToken4ReputationWrapper,
  ReleaseInfo
} from '@daostack/arc.js';
import { AureliaConfiguration } from 'aurelia-configuration';
import { Container } from 'aurelia-framework';
import { BigNumber } from 'bignumber.js';
import { Address, LockInfo, Locking4ReputationWrapper } from 'services/ArcService';

export class LockService {

  public static maxTokenApprovalAmount = new BigNumber('999999999999999999999999999999999999999999999999');

  public static initialize(container: Container) {
    this.appConfig = container.get(AureliaConfiguration);
  }

  private static lockableTokens: Map<Address, ITokenSpecification> = new Map<Address, ITokenSpecification>();

  private static appConfig: AureliaConfiguration;

  public lockableTokenSpecs: Array<ITokenSpecification>;

  constructor(
    private wrapper: Locking4ReputationWrapper,
    private userAddress: Address,
    private startingBlockNumber: number
  ) {
    this.lockableTokenSpecs = LockService.appConfig.get('lockableTokens');
  }

  public async getUserLocks(): Promise<Array<ILockInfoX>> {

    const releasesFetcher = this.wrapper.getReleases();

    const releases: Array<ReleaseInfo> = await releasesFetcher(
      { _beneficiary: this.userAddress },
      { fromBlock: this.startingBlockNumber }).get();

    const locks = new Map<string, ILockInfoX>();

    const locksEvents = await this.wrapper.Lock(
      { _locker: this.userAddress },
      { fromBlock: this.startingBlockNumber }).get();

    for (const event of locksEvents) {
      const amount = event.args._amount;
      const released = !!releases.filter((ri: ReleaseInfo) => ri.lockId === event.args._lockingId).length;

      if (!locks.get(event.args._lockingId)) {
        const lockInfo = await this.wrapper.contract.lockers(this.userAddress, event.args._lockingId);

        locks.set(event.args._lockingId, {
          amount,
          lockId: event.args._lockingId,
          lockerAddress: event.args._locker,
          releaseTime: new Date(lockInfo[1].toNumber() * 1000),
          released,
          transactionHash: event.transactionHash,
        });
      }
    }
    return Array.from(locks.values());
  }

  public async getUserUnReleasedLockCount(): Promise<number> {

    const releasesFetcher = this.wrapper.getReleases();

    const releases: Array<ReleaseInfo> = await releasesFetcher(
      { _beneficiary: this.userAddress },
      { fromBlock: this.startingBlockNumber }).get();

    const locks = new Map<string, ILockInfoX>();
    let lockCount = 0;

    const locksEvents = await this.wrapper.Lock(
      { _locker: this.userAddress },
      { fromBlock: this.startingBlockNumber }).get();

    for (const event of locksEvents) {
      const released = !!releases.filter((ri: ReleaseInfo) => ri.lockId === event.args._lockingId).length;

      if (!released && !locks.get(event.args._lockingId)) {
        ++lockCount;
      }
    }
    return lockCount;
  }

  // public async getUserLockedTokens(): Promise<Array<Erc20Wrapper>> {
  //   const locks = await this.getUserLocks();
  //   const tokens = new Array<Erc20Wrapper>();
  //   const tokenWrapper = (this.wrapper as LockingToken4ReputationWrapper);
  //   for (const lock of locks) {
  //     const token = await tokenWrapper.getTokenForLock(lock.lockId);
  //     tokens.push(token);
  //   }
  //   return tokens;
  // }

  // public async getUserTotalLockedAmount(): Promise<BigNumber> {
  //   const locks = await this.getUserLocks();
  //   let amount = new BigNumber(0);
  //   for (const lock of locks) {
  //     amount = amount.add(lock.amount);
  //   }
  //   return amount;
  // }

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
        return tokenSpec.address.toLowerCase() === token.address.toLowerCase();
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

export interface ILockInfoX extends LockInfo {
  transactionHash: Hash;
}
