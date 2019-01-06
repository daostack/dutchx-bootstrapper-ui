import { autoinject, bindable, bindingMode } from 'aurelia-framework';
import { Address, LockerInfo, LockInfo, Locking4ReputationWrapper } from 'services/ArcService';
import { Web3Service } from 'services/Web3Service';

@autoinject
export class LocksForReputation {

  public _locks: LockInfo[];

  public anyCanRelease: boolean;
  public loading: boolean = true;
  // anyCanRedeem: boolean;

  @bindable({ defaultBindingMode: bindingMode.oneWay }) public locks: LockInfo[];
  @bindable({ defaultBindingMode: bindingMode.oneTime }) public release: ({ lock: LockInfo }) => Promise<boolean>;
  // @bindable({ defaultBindingMode: bindingMode.oneTime }) redeem: ({ lock: LockInfo }) => Promise<boolean>;
  @bindable({ defaultBindingMode: bindingMode.oneTime }) public wrapper: Locking4ReputationWrapper;
  @bindable({ defaultBindingMode: bindingMode.oneTime }) public refresh: Promise<void>;

  constructor(private web3Service: Web3Service) {
  }

  public attached() {
    this.locksChanged(this.locks);
  }

  public async locksChanged(newLocks: LockInfo[]) {
    if (!this.wrapper) {
      // then we haven't been attached yet, so wait
      return;
    }

    this.loading = true;
    const _tmpLocks = newLocks as LockInfoInternal[];

    for (const lock of _tmpLocks) {
      // lock.canRedeem = await this.canRedeem(lock);
      lock.canRelease = await this.canRelease(lock);
    }
    this.anyCanRelease = _tmpLocks.filter((l: LockInfoInternal) => l.canRelease).length > 0;
    // this.anyCanRedeem = _tmpLocks.filter((l: LockInfoInternal) => l.canRedeem).length > 0;
    this._locks = _tmpLocks;
    this.loading = false;
  }

  private async _release(lock: LockInfoInternal) {
    if (!lock.canRelease) { return; }

    lock.releasing = true;
    try {
      const success = await this.release({ lock });
      if (success) {
        lock.canRelease = false; // await this.canRelease(lock);
        lock.amount = (await this.wrapper.getLockInfo(lock.lockerAddress, lock.lockId)).amount;
      }
    } finally {
      lock.releasing = false;
    }
  }

  // private async _redeem(lock: LockInfoInternal) {
  //   const success = await this.redeem({ lock });
  //   if (success) {
  //     lock.canRedeem = false; // await this.canRedeem(lock);
  //   }
  // }

  private async canRelease(lock: LockInfo): Promise<boolean> {
    if (lock.lockerAddress !== this.web3Service.defaultAccount) {
      return false;
    } else {
      const errMsg = await this.wrapper.getReleaseBlocker(lock.lockerAddress, lock.lockId);
      return !errMsg;
    }
  }
  // private async canRedeem(lock: LockInfo): Promise<boolean> {
  //   if (lock.lockerAddress !== this.web3Service.defaultAccount) {
  //     return false;
  //   } else {
  //     const errMsg = await this.wrapper.getRedeemBlocker(lock.lockerAddress);
  //     return !errMsg;
  //   }
  // }
}

export interface LockInfoX extends LockInfo {
  units: string;
}

interface LockInfoInternal extends LockInfoX {
  // canRedeem: boolean;
  canRelease: boolean;
  releasing: boolean;
}
