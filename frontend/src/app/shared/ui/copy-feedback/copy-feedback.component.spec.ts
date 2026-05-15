import { TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { vi } from 'vitest';

import { CopyFeedbackComponent } from './copy-feedback.component';

describe('CopyFeedbackComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent]
    }).compileComponents();
  });

  it('shows copied feedback briefly after a successful click', async () => {
    vi.useFakeTimers();
    const clipboardWriteText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: clipboardWriteText }
    });

    const fixture = TestBed.createComponent(TestHostComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const copyFeedback = fixture.debugElement.children[0].componentInstance as CopyFeedbackComponent & {
      copy: () => Promise<void>;
    };

    expect(fixture.nativeElement.textContent).not.toContain('Copied!');

    await copyFeedback.copy();
    fixture.detectChanges();

    expect(clipboardWriteText).toHaveBeenCalledWith('AL44 2121 1009 0000 0647 5083 5101');
    expect(fixture.nativeElement.textContent).toContain('Copied!');

    vi.advanceTimersByTime(1700);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).not.toContain('Copied!');
    vi.useRealTimers();
  });
});

@Component({
  imports: [CopyFeedbackComponent],
  template: `
    <app-copy-feedback
      textToCopy="AL44 2121 1009 0000 0647 5083 5101"
      copiedText="Copied!"
      [duration]="1700"
    >
      <button type="button">Copy</button>
    </app-copy-feedback>
  `
})
class TestHostComponent {}
