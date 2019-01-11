import { EventAggregator } from 'aurelia-event-aggregator';
import { autoinject, bindable, bindingMode } from 'aurelia-framework';
import { LockInfo, Locking4ReputationWrapper } from 'services/ArcService';
import { Web3Service } from 'services/Web3Service';

@autoinject
export class LocksForReputation {

  @bindable({ defaultBindingMode: bindingMode.oneWay }) public locks: Array<LockInfo>;
  // tslint:disable-next-line: variable-name
  @bindable({ defaultBindingMode: bindingMode.oneTime }) public release: ({ lock: LockInfo }) => Promise<boolean>;
  @bindable({ defaultBindingMode: bindingMode.oneTime }) public wrapper: Locking4ReputationWrapper;
  @bindable({ defaultBindingMode: bindingMode.oneTime }) public refresh: () => Promise<void>;

  private _locks: Array<LockInfo>;
  private anyCanRelease: boolean;
  private loading: boolean = true;

  constructor(
      private web3Service: Web3Service
    , private eventAggregator: EventAggregator
    ) {
  }

  public attached() {
    this.locksChanged(this.locks);
  }

  private async locksChanged(newLocks: Array<LockInfo>) {
    if (!this.wrapper) {
      // then we haven't been attached yet, so wait
      return;
    }

    this.loading = true;
    const tmpLocks = newLocks as Array<ILockInfoInternal>;

    for (const lock of tmpLocks) {
      // lock.canRedeem = await this.canRedeem(lock);
      lock.canRelease = await this.canRelease(lock);
    }
    this.anyCanRelease = tmpLocks.filter((l: ILockInfoInternal) => l.canRelease).length > 0;
    this._locks = tmpLocks;
    this.loading = false;
  }

  private async _release(lock: ILockInfoInternal) {
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

  private async canRelease(lock: LockInfo): Promise<boolean> {
    if (lock.lockerAddress !== this.web3Service.defaultAccount) {
      return false;
    } else {
      const errMsg = await this.wrapper.getReleaseBlocker(lock.lockerAddress, lock.lockId);
      return !errMsg;
    }
  }

  private async _refresh(): Promise<void> {
    this.loading = true;
    try {
      await this.refresh();
      this.eventAggregator.publish('showMessage', 'Locks have been refreshed');
    } finally {
      this.loading = false;
    }
  }
}

export interface ILockInfoX extends LockInfo {
  units: string;
}

interface ILockInfoInternal extends ILockInfoX {
  canRelease: boolean;
  releasing: boolean;
}
