import { PopoverOption } from 'bootstrap';
import { EventMessageType } from '../entities/GeneralEvents';

export class BalloonService {

  public static show(config: IBalloonConfig): Promise<void> {

    const element = $(config.originatingUiElement);

    if (this.getPopover(element)) {
      return;
    }

    return new Promise((resolve: () => void) => {

      // tslint:disable-next-line: max-line-length
      const title = `<div class="balloonTitle">An Error Has Occurred <button type="button" class="closeBalloon" aria-label="Close"><span aria-hidden="true">&times;</span></button></div>`;
      const content = `<div class="balloonBody">${config.content}</div>`;

      element.popover(
        Object.assign({},
          config as PopoverOption,
          {
            container: 'body',
            html: true,
            placement: 'top',
            title,
            trigger: 'manual',
          },
          { content }));

      element.on('inserted.bs.popover', (_evt): void => {
        const popover = this.getPopover(element);
        popover.addClass('balloon');
        popover.data(this.promiseResolveFn, resolve);
      });

      setTimeout(() => {
        element.popover('show');
      }, 0);
    });
  }

  public static hide(closeButton: JQuery) {
    const popover = closeButton.parents('.popover');
    // resolve the promise
    (popover.data(this.promiseResolveFn) as () => void)();
    popover.data(this.promiseResolveFn, undefined);
    popover.popover('dispose');
  }

  private static promiseResolveFn = 'balloon.promise.resolve';

  private static getPopover(element: JQuery): JQuery {
    return element.data('bs.popover') ? $(element.data('bs.popover').tip) : undefined;
  }
}

$(document).on('click', '.popover .closeBalloon', function() {
  BalloonService.hide($(this));
});

export interface IBalloonConfig {
  container?: string;
  content: string;
  eventMessageType: EventMessageType;
  originatingUiElement: HTMLElement;
  placement?: string;
  title?: string;
}
