// src/app/thousand-separator.directive.ts
import { Directive, ElementRef, HostListener, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Directive({
  selector: '[appThousandSeparator]',
  standalone: true,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ThousandSeparatorDirective),
      multi: true,
    },
  ],
})
export class ThousandSeparatorDirective implements ControlValueAccessor {
  // Callbacks to inform Angular Forms of changes
  private _onChange: (value: any) => void = () => {};
  private _onTouched: () => void = () => {};

  constructor(private el: ElementRef<HTMLInputElement>) {}

  /**
   * This method is called by Angular Forms to write a value into the view.
   * This handles the case where data is loaded programmatically (e.g., from an API).
   */
  writeValue(value: any): void {
    this.el.nativeElement.value = this.format(value);
  }

  registerOnChange(fn: any): void {
    this._onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this._onTouched = fn;
  }

  /**
   * Listen for user input and update the model and view.
   */
  @HostListener('input', ['$event.target.value'])
  onInput(value: string): void {
    const rawValue = this.unformat(value);
    // Update the form model with the raw, unformatted number
    this._onChange(rawValue);
    // Update the input element's display value with the formatted number
    this.el.nativeElement.value = this.format(rawValue);
  }

  @HostListener('blur')
  onBlur(): void {
    this._onTouched();
  }

  /**
   * Formats a number with thousand separators.
   * Handles null, undefined, and non-numeric values gracefully.
   */
  private format(value: string | number | null): string {
    if (value === null || value === undefined || value === '') {
      return '';
    }
    // Ensure we are working with a clean number string
    const num = Number(String(value).replace(/[^0-9.-]/g, ''));
    if (isNaN(num)) {
      return '';
    }
    // Use Intl.NumberFormat for reliable formatting
    return new Intl.NumberFormat('en-US').format(num);
  }

  /**
   * Removes thousand separators to get the raw number string.
   */
  private unformat(value: string): string {
    if (!value) {
      return '';
    }
    return value.replace(/,/g, '');
  }
}