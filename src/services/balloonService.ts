import { PopoverOption } from 'bootstrap';
import { EventMessageType } from '../entities/GeneralEvents';

export class BalloonService {

  public static show(config: IBalloonConfig) {
    const element = $(config.originatingUiElement);
    if ($(element).data('bs.popover') && $($(element).data('bs.popover').tip).hasClass('show')) {
      return;
    }

    // tslint:disable-next-line: max-line-length
    const title = `<div class="balloonTitle">An Error Has Occurred <button type="button" class="closeBalloon" aria-label="Close"><span aria-hidden="true">&times;</span></button></div>`;
    const content = `<div class="balloonBody">${config.content}</div>`;

    const po = element.popover(
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

    $(element).on('inserted.bs.popover', (_evt: Event): void => {
      $($(_evt.target).data('bs.popover').tip).addClass('balloon');
    });

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
