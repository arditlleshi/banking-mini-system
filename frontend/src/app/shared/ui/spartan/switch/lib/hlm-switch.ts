import type { BooleanInput } from '@angular/cdk/coercion';
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  forwardRef,
  input,
  linkedSignal,
  model,
  output,
} from '@angular/core';
import { type ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import type { ChangeFn, TouchFn } from '@spartan-ng/brain/forms';
import { BrnSwitch, BrnSwitchThumb } from '@spartan-ng/brain/switch';
import { hlm } from '@spartan/utils';
import type { ClassValue } from 'clsx';
import { HlmSwitchThumb } from './hlm-switch-thumb';

export const HLM_SWITCH_VALUE_ACCESSOR = {
  provide: NG_VALUE_ACCESSOR,
  useExisting: forwardRef(() => HlmSwitch),
  multi: true,
};

@Component({
  selector: 'hlm-switch',
  imports: [BrnSwitchThumb, BrnSwitch, HlmSwitchThumb],
  providers: [HLM_SWITCH_VALUE_ACCESSOR],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'contents',
    '[attr.aria-label]': 'null',
    '[attr.aria-labelledby]': 'null',
    '[attr.aria-describedby]': 'null',
  },
  template: `
    <brn-switch
      [class]="computedClass()"
      [checked]="checked()"
      (checkedChange)="handleChange($event)"
      (touched)="onTouched?.()"
      [disabled]="disabledState()"
      [id]="inputId()"
      [attr.aria-label]="ariaLabel()"
      [attr.aria-labelledby]="ariaLabelledby()"
      [attr.aria-describedby]="ariaDescribedby()"
    >
      <brn-switch-thumb hlm />
    </brn-switch>
  `,
})
export class HlmSwitch implements ControlValueAccessor {
  readonly userClass = input<ClassValue>('', { alias: 'class' });
  protected readonly computedClass = computed(() =>
    hlm(
      'data-[state=checked]:bg-primary data-[state=unchecked]:[background:var(--switch-track-unchecked)] focus-visible:border-ring focus-visible:ring-ring/50 group inline-flex h-5 w-9 shrink-0 items-center rounded-full border border-transparent shadow-xs transition-[background-color,border-color,box-shadow] outline-none focus-visible:ring-[3px] data-[disabled=true]:cursor-not-allowed data-[disabled=true]:opacity-50',
      this.userClass(),
    ),
  );

  readonly checkedInput = input<boolean>(false, { alias: 'checked' });
  readonly checked = linkedSignal(this.checkedInput);
  readonly checkedChange = output<boolean>();
  readonly disabled = input<boolean, BooleanInput>(false, {
    transform: booleanAttribute,
  });
  readonly inputId = input<string | null>(null);
  readonly ariaLabel = input<string | null>(null, { alias: 'aria-label' });
  readonly ariaLabelledby = input<string | null>(null, { alias: 'aria-labelledby' });
  readonly ariaDescribedby = input<string | null>(null, { alias: 'aria-describedby' });

  protected readonly disabledState = linkedSignal(this.disabled);

  protected onChange?: ChangeFn<boolean>;
  protected onTouched?: TouchFn;

  protected handleChange(value: boolean): void {
    this.checked.set(value);
    this.onChange?.(value);
    this.checkedChange.emit(value);
  }

  writeValue(value: boolean): void {
    this.checked.set(Boolean(value));
  }

  registerOnChange(fn: ChangeFn<boolean>): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: TouchFn): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabledState.set(isDisabled);
  }
}
