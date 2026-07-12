export type OutputKind = "document" | "spreadsheet" | "presentation" | "data_chart" | "image";
export type CapabilityState = "supported" | "preview_only" | "unsupported";

export interface OutputVersionView {
  readonly id: string;
  readonly ordinal: number;
  readonly label: string;
  readonly author: string;
  readonly createdAt: string;
  readonly branchId: string;
}

export interface OutputView {
  readonly id: string;
  readonly title: string;
  readonly kind: OutputKind;
  readonly lifecycle: "working" | "generated" | "validating" | "ready_for_review" | "approved" | "published" | "superseded" | "archived";
  readonly capability: CapabilityState;
  readonly capabilityMessage: string;
  readonly activeVersionId: string;
  readonly versions: readonly OutputVersionView[];
  readonly preview:
    | { readonly kind: "document"; readonly blocks: ReadonlyArray<{ readonly id: string; readonly type: "heading" | "paragraph" | "list"; readonly text: string }> }
    | { readonly kind: "spreadsheet"; readonly columns: readonly string[]; readonly rows: ReadonlyArray<Readonly<Record<string, string | number | null>>> }
    | { readonly kind: "presentation"; readonly slides: ReadonlyArray<{ readonly id: string; readonly title: string; readonly summary: string }> }
    | { readonly kind: "data_chart"; readonly chartType: string; readonly points: ReadonlyArray<{ readonly label: string; readonly value: number }> }
    | { readonly kind: "image"; readonly src: string; readonly alt: string; readonly width: number; readonly height: number };
  readonly validation: ReadonlyArray<{ readonly code: string; readonly status: "passed" | "warning" | "failed"; readonly message: string }>;
}

export interface OutputActions {
  readonly onSelectVersion: (versionId: string) => void;
  readonly onCheckpoint: () => void | Promise<void>;
  readonly onRestore: (versionId: string) => void | Promise<void>;
  readonly onCompare: (beforeVersionId: string, afterVersionId: string) => void | Promise<void>;
  readonly onBranch: (versionId: string) => void | Promise<void>;
  readonly onPromote: (versionId: string) => void | Promise<void>;
}
