import { EventAggregator } from 'aurelia-event-aggregator';
import { autoinject, bindable, bindingMode } from 'aurelia-framework';
import { LockInfo, Locking4ReputationWrapper } from 'services/ArcService';
import { DateService } from 'services/DateService';
import { ILockInfoX } from 'services/lockServices';
import { Web3Service } from 'services/Web3Service';

@autoinject
export class LocksForReputation {

  @bindable({ defaultBindingMode: bindingMode.oneWay })
  public locks: Array<LockInfo> = [];
  // tslint:disable-next-line: variable-name
  @bindable({ defaultBindingMode: bindingMode.oneTime })
  public release: (config: { lock: LockInfo, releaseButton: JQuery<EventTarget> }) => Promise<boolean>;
  @bindable({ defaultBindingMode: bindingMode.oneTime }) public wrapper: Locking4ReputationWrapper;
  @bindable({ defaultBindingMode: bindingMode.oneTime }) public refresh: () => Promise<void>;

  private _locks: Array<LockInfo>;
  private anyCanRelease: boolean;
  private loading: boolean = true;

  constructor(
    private web3Service: Web3Service,
    private eventAggregator: EventAggregator,
    private dateService: DateService
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
      lock.releasableToday = this.releasableToday(lock.releaseTime);
    }
    this.anyCanRelease = tmpLocks.filter((l: ILockInfoInternal) => l.canRelease).length > 0;
    this._locks = tmpLocks;
    this.loading = false;
  }

  private async _release(lock: ILockInfoInternal, event: Event) {
    if (!lock.canRelease) { return; }

    try {
      lock.releasing = true;

      const releaseButton = $(event.target).next();

      const success = await this.release({ lock, releaseButton });
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

  /**
   * Returns whether the given lock release date/time occurs today.
   * "Today" is defined in terms of the calendar day, local time.
   * @param releaseTime
   */
  private releasableToday(releaseTime: Date): boolean {
    const now = new Date();
    return (releaseTime.getDate() === now.getDate()) &&
      (releaseTime.getMonth() === now.getMonth()) &&
      (releaseTime.getFullYear() === now.getFullYear());
  }

  private releaseDate(lock: ILockInfoInternal): string {

    // tslint:disable-next-line: max-line-length
    return `${this.dateService.toString(lock.releaseTime, lock.releasableToday ? 'table-time' : 'table-date')}${lock.releasableToday ? ' today' : ''}`;
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

export interface ILocksTableInfo extends ILockInfoX {
  units: string;
  sending: boolean;
}

interface ILockInfoInternal extends ILocksTableInfo {
  canRelease: boolean;
  releasing: boolean;
  releasableToday: boolean;
}
