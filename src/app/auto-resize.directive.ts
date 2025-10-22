import { Directive, ElementRef, HostListener, OnInit } from '@angular/core';

@Directive({
  selector: 'textarea[appAutoResize]', // Attribute selector
  standalone: true,
})
export class AutoResizeDirective implements OnInit {
  constructor(private elementRef: ElementRef) {}

  @HostListener(':input')
  onInput(): void {
    this.adjust();
  }

  ngOnInit(): void {
    // Adjust height initially in case of pre-filled text
    setTimeout(() => this.adjust(), 0);
  }

  /**
   * Adjusts the textarea height to fit its content.
   */
  adjust(): void {
    const textarea = this.elementRef.nativeElement as HTMLTextAreaElement;
    // textarea.style.overflow = 'hidden'; // Hide scrollbar
    textarea.style.height = 'auto'; // Reset height
    textarea.style.height = `${textarea.scrollHeight}px`; // Set height to content height
  }
}