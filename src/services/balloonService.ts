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
      const title = `<div class="balloonTitle"><div class="text">An Error Has Occurred</div><button type="button" class="closeBalloon" aria-label="Close"><span aria-hidden="true">&times;</span></button></div>`;
      const content = `<div class="balloonBody">${config.content}</div>`;
      const mergedConfig = Object.assign({},
        config as PopoverOption,
        {
          container: 'body',
          html: true,
          placement: 'top',
          title,
          trigger: 'manual',
        },
        { content });

      element.popover(mergedConfig);

      element.on('inserted.bs.popover', (_evt): void => {
        const popover = this.getPopover(element);
        popover.addClass('balloon');
        popover.data(this.promiseResolveFn, resolve);
        element.addClass('hasBalloon');
      });

      setTimeout(() => {
        element.popover('show');
      }, 0);
    });
  }

  public static hide(container: JQuery) {
    const element = container.find('.hasBalloon');
    const popover = this.getPopover(element);
    if (popover) {
      popover.css({ visibility: 'hidden' });
    }
  }

  public static unhide(container: JQuery) {
    const element = container.find('.hasBalloon');
    const popover = this.getPopover(element);
    if (popover) {
      setTimeout(() => {
        popover.css({ visibility: 'visible' });
        // to recompute position in case the page has been scrolled
        popover.popover('update');
      }, 0);
    }
  }

  public static close(closeButton: JQuery) {
    const popover = closeButton.parents('.popover');
    // resolve the promise
    (popover.data(this.promiseResolveFn) as () => void)();
    popover.data(this.promiseResolveFn, undefined);
    $(popover.data('bs.popover').element).removeClass('hasBalloon');
    popover.popover('dispose');
  }

  private static promiseResolveFn = 'balloon.promise.resolve';

  private static getPopover(element: JQuery): JQuery {
    return element.data('bs.popover') ? $(element.data('bs.popover').tip) : undefined;
  }
}

$(document).on('click', '.popover .closeBalloon', function() {
  BalloonService.close($(this));
});

export interface IBalloonConfig {
  container?: string;
  content: string;
  eventMessageType: EventMessageType;
  originatingUiElement: HTMLElement | JQuery<any>;
  placement?: string;
  title?: string;
}
