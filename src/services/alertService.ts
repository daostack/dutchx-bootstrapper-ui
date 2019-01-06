import { EventAggregator } from 'aurelia-event-aggregator';
import { autoinject } from 'aurelia-framework';
import { EventConfig, EventConfigException } from '../entities/GeneralEvents';
import { DialogService } from './dialogService';
import { DisposableCollection } from './DisposableCollection';

@autoinject
export class AlertService {

  // probably doesn't really need to be a disposable collection since this is a singleton service
  public subscriptions: DisposableCollection = new DisposableCollection();

  constructor(
    eventAggregator: EventAggregator,
    private dialogService: DialogService,
  ) {
    this.subscriptions.push(eventAggregator.subscribe('handleException', (config: EventConfigException | any) => this.handleException(config)));
    this.subscriptions.push(eventAggregator.subscribe('handleFailure', (config: EventConfig | string) => this.handleFailure(config)));
  }

  /* shouldn't actually ever happen */
  public dispose() {
    this.subscriptions.dispose();
  }

  public showMessage(config: EventConfig | string) {
    this.dialogService.alert(this.getMessage(config));
  }

  public handleException(config: EventConfigException | any) {
    let message;
    if (!(config instanceof EventConfigException)) {
      const ex = config as any;
      message = `${ex.message ? ex.message : ex}`;
    } else {
      config = config as EventConfigException;
      message = config.message;
    }

    this.dialogService.alert(message);
  }

  public handleFailure(config: EventConfig | string) {
    this.dialogService.alert(this.getMessage(config));
  }

  private getMessage(config: EventConfig | string): string {
    return (typeof config == 'string') ? config : config.message;
  }
}
