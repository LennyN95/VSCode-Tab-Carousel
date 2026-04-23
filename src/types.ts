import * as vscode from 'vscode';

export interface RecentTabEntry {
  readonly key: string;
  readonly uri: vscode.Uri;
  readonly label: string;
  readonly description: string;
  readonly viewColumn?: vscode.ViewColumn;
}
