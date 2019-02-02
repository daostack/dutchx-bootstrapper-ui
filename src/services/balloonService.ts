import { PopoverOption } from 'bootstrap';
import { EventMessageType } from '../entities/GeneralEvents';

export class BalloonService {

  public static show(config: IBalloonConfig) {
    const element = $(config.originatingUiElement);
    // const fnPopover = element.popover;
    // const close = () => { fnPopover('dispose'); };
    // tslint:disable-next-line: max-line-length
    const title = `<span class='message'>An Error Has Occurred</span> <button type="button" class="closeBalloon" aria-label="Close"><span aria-hidden="true">&times;</span></button>`;

    element.popover(
      Object.assign({},
        config as PopoverOption,
        {
          container: 'body',
          html: true,
          placement: 'top',
          title,
          trigger: 'manual',
        }));

    // setTimeout(() => { element.triggerHandler('focus'); }, 0);
    // setTimeout(() => { element.focus(); }, 0);
    setTimeout(() => {
      element.popover('show');
    }, 0);
  }

}

$(document).on('click', '.popover .closeBalloon', function() {
  $(this).parents('.popover').popover('dispose');
});

export interface IBalloonConfig {
  container?: string;
  content: string;
  eventMessageType: EventMessageType;
  originatingUiElement: HTMLElement;
  placement?: string;
  title?: string;
}
