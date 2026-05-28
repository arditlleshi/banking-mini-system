import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';

export type ThemeMode = 'light' | 'dark';

const STORAGE_KEY = 'banking-theme-mode';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly modeSignal = signal<ThemeMode>('light');

  readonly mode = this.modeSignal.asReadonly();
  readonly isDark = computed(() => this.modeSignal() === 'dark');

  constructor() {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const storedMode = window.localStorage.getItem(STORAGE_KEY);
    const prefersDarkMode =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialMode =
      storedMode === 'dark' || storedMode === 'light'
        ? storedMode
        : prefersDarkMode
          ? 'dark'
          : 'light';

    this.setMode(initialMode, false);
  }

  setMode(mode: ThemeMode, persist = true): void {
    this.modeSignal.set(mode);

    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const root = this.document.documentElement;
    root.classList.toggle('dark', mode === 'dark');
    root.style.colorScheme = mode;

    if (persist) {
      window.localStorage.setItem(STORAGE_KEY, mode);
    }
  }

  toggle(): void {
    this.setMode(this.isDark() ? 'light' : 'dark');
  }
}
