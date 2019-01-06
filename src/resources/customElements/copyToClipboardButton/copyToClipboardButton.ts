import { EventAggregator } from 'aurelia-event-aggregator';
import { autoinject, bindable, containerless } from 'aurelia-framework';

@containerless
@autoinject
export class CopyToClipboardButton {

  /** supply either element or textToCopy */
  @bindable
  public element: HTMLElement;

  /** supply either element or textToCopy */
  @bindable
  public textToCopy: string;

  @bindable
  public message: string = 'Copied to the clipboard';

  public button: HTMLElement;

  constructor(
    private eventAggregator: EventAggregator,
  ) { }

  public attached() {
    ($(this.button) as any).tooltip(
      {
        toggle: 'tooltip',
        placement: 'right',
        title: 'Copy to clipboard',
        trigger: 'hover',
      },
    )
      // .css("z-index", "100000")
      ;
  }

  public listener(e) { e.clipboardData.setData('text/plain', this.textToCopy); e.preventDefault(); }

  public copy(e: Event) {
    if (this.element) {
      this.textToCopy = $(this.element).text();
    }

    let handler = this.listener.bind(this);

    document.addEventListener('copy', handler);
    document.execCommand('copy');
    document.removeEventListener('copy', handler);

    this.eventAggregator.publish('showMessage', this.message);

    e.stopPropagation();
  }
}
