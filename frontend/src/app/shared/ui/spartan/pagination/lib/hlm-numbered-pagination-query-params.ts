import type { BooleanInput, NumberInput } from '@angular/cdk/coercion';
import {
  ChangeDetectionStrategy,
  Component,
  booleanAttribute,
  computed,
  input,
  model,
  numberAttribute,
  untracked
} from '@angular/core';

import { createPageArray, outOfBoundCorrection } from './hlm-numbered-pagination';
import { HlmPagination } from './hlm-pagination';
import { HlmPaginationContent } from './hlm-pagination-content';
import { HlmPaginationEllipsis } from './hlm-pagination-ellipsis';
import { HlmPaginationItem } from './hlm-pagination-item';
import { HlmPaginationLink } from './hlm-pagination-link';
import { HlmPaginationNext } from './hlm-pagination-next';
import { HlmPaginationPrevious } from './hlm-pagination-previous';

@Component({
  selector: 'hlm-numbered-pagination-query-params',
  imports: [
    HlmPagination,
    HlmPaginationContent,
    HlmPaginationItem,
    HlmPaginationPrevious,
    HlmPaginationNext,
    HlmPaginationLink,
    HlmPaginationEllipsis
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav hlmPagination>
      <ul hlmPaginationContent>
        @if (showEdges() && !_isFirstPageActive()) {
          <li hlmPaginationItem>
            <hlm-pagination-previous
              [link]="link()"
              [queryParams]="{ page: currentPage() - 1 }"
              queryParamsHandling="merge"
            />
          </li>
        }

        @for (page of _pages(); track page) {
          <li hlmPaginationItem>
            @if (page === '...') {
              <hlm-pagination-ellipsis />
            } @else {
              <a
                hlmPaginationLink
                [link]="currentPage() !== page ? link() : undefined"
                [queryParams]="{ page }"
                queryParamsHandling="merge"
                [isActive]="currentPage() === page"
              >
                {{ page }}
              </a>
            }
          </li>
        }

        @if (showEdges() && !_isLastPageActive()) {
          <li hlmPaginationItem>
            <hlm-pagination-next
              [link]="link()"
              [queryParams]="{ page: currentPage() + 1 }"
              queryParamsHandling="merge"
            />
          </li>
        }
      </ul>
    </nav>
  `
})
export class HlmNumberedPaginationQueryParams {
  /**
   * The current (active) page.
   */
  readonly currentPage = model.required<number>();

  /**
   * The number of items per paginated page.
   */
  readonly itemsPerPage = model.required<number>();

  /**
   * The total number of items in the collection.
   */
  readonly totalItems = input.required<number, NumberInput>({
    transform: numberAttribute
  });

  /**
   * The URL path to use for the pagination links.
   * Defaults to '.' (current path).
   */
  readonly link = input<string>('.');

  /**
   * The number of page links to show.
   */
  readonly maxSize = input<number, NumberInput>(7, {
    transform: numberAttribute
  });

  /**
   * Show the first and last page buttons.
   */
  readonly showEdges = input<boolean, BooleanInput>(true, {
    transform: booleanAttribute
  });

  protected readonly _isFirstPageActive = computed(() => this.currentPage() === 1);
  protected readonly _isLastPageActive = computed(() => this.currentPage() === this._lastPageNumber());

  protected readonly _lastPageNumber = computed(() => {
    if (this.totalItems() < 1) {
      return 1;
    }
    return Math.ceil(this.totalItems() / this.itemsPerPage());
  });

  protected readonly _pages = computed(() => {
    const correctedCurrentPage = outOfBoundCorrection(this.totalItems(), this.itemsPerPage(), this.currentPage());

    if (correctedCurrentPage !== this.currentPage()) {
      untracked(() => this.currentPage.set(correctedCurrentPage));
    }

    return createPageArray(correctedCurrentPage, this.itemsPerPage(), this.totalItems(), this.maxSize());
  });
}
