// src/app/thousand-separator.directive.ts
import { Directive, ElementRef, HostListener, forwardRef, Renderer2, OnInit } from '@angular/core';
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
export class ThousandSeparatorDirective implements ControlValueAccessor, OnInit {
  private _onChange: (value: any) => void = () => { };
  private _onTouched: () => void = () => { };
  private isFocused = false;

  constructor(private el: ElementRef<HTMLInputElement>, private renderer: Renderer2) { }

  ngOnInit() {
    // Add styling for numeric inputs
    this.renderer.setStyle(this.el.nativeElement, 'text-align', 'right');
    this.renderer.setStyle(this.el.nativeElement, 'font-family', 'monospace');
  }

  writeValue(value: any): void {
    const numericValue = value === null || value === undefined ? '' : value;
    this.el.nativeElement.value = this.isFocused ? numericValue : this.format(numericValue);
  }

  registerOnChange(fn: any): void {
    this._onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this._onTouched = fn;
  }

  @HostListener('focus')
  onFocus(): void {
    this.isFocused = true;
    const rawValue = this.unformat(this.el.nativeElement.value);
    this.el.nativeElement.value = rawValue;

    // Select the text for easy replacement
    setTimeout(() => {
      this.el.nativeElement.select();
    }, 0);
  }

  @HostListener('blur')
  onBlur(): void {
    this.isFocused = false;
    this._onTouched();
    const value = this.el.nativeElement.value;
    const rawValue = this.unformat(value);
    // Whole numbers only (RM): round away any decimals (e.g. from pasted values)
    const numericValue = rawValue === '' ? null : Math.round(Number(rawValue));
    this._onChange(numericValue);
    this.el.nativeElement.value = this.format(numericValue);
  }

  @HostListener('input', ['$event.target.value'])
  onInput(value: string): void {
    // During input, we only update the model but don't format the view to avoid cursor jumps
    const rawValue = this.unformat(value);
    this._onChange(rawValue === '' ? null : Math.round(Number(rawValue)));
  }

  @HostListener('keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    // Allow: Delete, Backspace, Tab, Escape, Enter (decimal point blocked: RM whole numbers only)
    if ([46, 8, 9, 27, 13].indexOf(event.keyCode) !== -1 ||
      // Allow: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
      (event.keyCode === 65 && (event.ctrlKey || event.metaKey)) ||
      (event.keyCode === 67 && (event.ctrlKey || event.metaKey)) ||
      (event.keyCode === 86 && (event.ctrlKey || event.metaKey)) ||
      (event.keyCode === 88 && (event.ctrlKey || event.metaKey)) ||
      // Allow: home, end, left, right
      (event.keyCode >= 35 && event.keyCode <= 39)) {
      return;
    }
    // Ensure that it is a number and stop the keypress
    if ((event.shiftKey || (event.keyCode < 48 || event.keyCode > 57)) && (event.keyCode < 96 || event.keyCode > 105)) {
      event.preventDefault();
    }
  }

  private format(value: string | number | null): string {
    if (value === null || value === undefined || value === '') {
      return '';
    }
    const num = Number(String(value).replace(/[^0-9.-]/g, ''));
    if (isNaN(num)) {
      return '';
    }
    // Whole numbers only (RM): no decimal places
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(Math.round(num));
  }

  private unformat(value: string): string {
    if (!value) {
      return '';
    }
    return value.replace(/,/g, '');
  }

  setDisabledState(isDisabled: boolean): void {
    this.renderer.setProperty(this.el.nativeElement, 'disabled', isDisabled);
    if (isDisabled) {
      this.renderer.setStyle(this.el.nativeElement, 'background-color', '#e9ecef');
      this.renderer.setStyle(this.el.nativeElement, 'color', '#6c757d');
    } else {
      this.renderer.setStyle(this.el.nativeElement, 'background-color', '#fff');
      this.renderer.setStyle(this.el.nativeElement, 'color', '#495057');
    }
  }
}