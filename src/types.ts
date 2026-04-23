import * as vscode from 'vscode';

interface RecentTabEntryBase {
  readonly key: string;
  readonly label: string;
  readonly description: string;
  readonly viewColumn?: vscode.ViewColumn;
}

export interface RecentTextTabEntry extends RecentTabEntryBase {
  readonly kind: 'text';
  readonly uri: vscode.Uri;
}

export interface RecentTextDiffTabEntry extends RecentTabEntryBase {
  readonly kind: 'textDiff';
  readonly original: vscode.Uri;
  readonly modified: vscode.Uri;
}

export interface RecentCustomTabEntry extends RecentTabEntryBase {
  readonly kind: 'custom';
  readonly uri: vscode.Uri;
  readonly viewType: string;
}

export interface RecentNotebookTabEntry extends RecentTabEntryBase {
  readonly kind: 'notebook';
  readonly uri: vscode.Uri;
  readonly notebookType: string;
}

export interface RecentNotebookDiffTabEntry extends RecentTabEntryBase {
  readonly kind: 'notebookDiff';
  readonly original: vscode.Uri;
  readonly modified: vscode.Uri;
  readonly notebookType: string;
}

export type RecentTabEntry =
  | RecentTextTabEntry
  | RecentTextDiffTabEntry
  | RecentCustomTabEntry
  | RecentNotebookTabEntry
  | RecentNotebookDiffTabEntry;
