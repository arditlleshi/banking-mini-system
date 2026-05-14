import { type PageBreadcrumbItem } from '../../shared/ui/page-breadcrumb';

export type WorkspacePageContent = {
  readonly section: string;
  readonly eyebrow: string;
  readonly headline: string;
  readonly summary: string;
  readonly highlights: readonly string[];
  readonly breadcrumb: readonly PageBreadcrumbItem[];
};
