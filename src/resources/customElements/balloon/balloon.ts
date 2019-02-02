// import { EventAggregator } from 'aurelia-event-aggregator';
// import { autoinject, containerless } from 'aurelia-framework';
// import { EventConfig, EventConfigException, EventMessageType } from 'entities/GeneralEvents';
// import { fnVoid } from 'services/ArcService';
// import { AureliaHelperService } from 'services/AureliaHelperService';
// import { DisposableCollection } from 'services/DisposableCollection';

// @containerless
// @autoinject
// export class Banner {

//   private resolveToClose: fnVoid;
//   private elMessage: HTMLElement;
//   private subscriptions: DisposableCollection = new DisposableCollection();

//   constructor(
//     eventAggregator: EventAggregator,
//     private aureliaHelperService: AureliaHelperService
//   ) {
//     this.subscriptions.push(eventAggregator
//       .subscribe('handleException', (config: EventConfigException) => this.handleException(config)));
//     this.subscriptions.push(eventAggregator
//       .subscribe('handleFailure', (config: EventConfig) => this.handleFailure(config)));

//     // const that = this;
//     //   switch (config.type) {
//     //     case EventMessageType.Info:
//     //       $(that.balloon).addClass('info');
//     //       $(that.balloon).removeClass('failure');
//     //       break;
//     //     default:
//     //       $(that.balloon).addClass('failure');
//     //       $(that.balloon).removeClass('info');
//     //       break;
//     //   }
//     //   that.aureliaHelperService.enhanceElement(that.elMessage, that, true);
//   }

//   public dispose() {
//     this.subscriptions.dispose();
//   }

//   private handleException(config: EventConfigException) {
//     if (!config.originatingUiElement) {
//       return;
//     }
//     this.show({
//       message: config.message,
//       originatingUiElement: config.originatingUiElement,
//       type: EventMessageType.Exception,
//     });
//   }

//   private handleFailure(config: EventConfig) {
//     if (!config.originatingUiElement) {
//       return;
//     }
//     this.show({
//       message: config.message,
//       originatingUiElement: config.originatingUiElement,
//       type: EventMessageType.Failure,
//     });
//   }

//   private show(config: IBalloonConfig) {
//     $(that.balloon).popover();
//   }
// }

// interface IBalloonConfig {
//   type: EventMessageType;
//   message: string;
//   originatingUiElement: HTMLElement;
// }
