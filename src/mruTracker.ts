import * as path from 'node:path';
import * as vscode from 'vscode';

import { RecentTabEntry } from './types';

interface OpenTextTab {
  readonly key: string;
  readonly uri: vscode.Uri;
  readonly label: string;
  readonly description: string;
  readonly viewColumn?: vscode.ViewColumn;
  readonly order: number;
}

export class RecentTabTracker implements vscode.Disposable {
  private readonly disposables: vscode.Disposable[] = [];
  private entries: RecentTabEntry[] = [];

  public constructor(private readonly maxEntries = 5) {
    this.seedInitialEntries();

    this.disposables.push(
      vscode.window.onDidChangeActiveTextEditor((editor) => {
        if (editor) {
          this.recordEditor(editor);
        }
      }),
      vscode.window.tabGroups.onDidChangeTabs(() => {
        this.pruneAndRefresh();
      }),
      vscode.window.tabGroups.onDidChangeTabGroups(() => {
        this.pruneAndRefresh();
      }),
    );

    if (vscode.window.activeTextEditor) {
      this.recordEditor(vscode.window.activeTextEditor);
    }
  }

  public dispose(): void {
    vscode.Disposable.from(...this.disposables).dispose();
  }

  public getRecentTabs(): RecentTabEntry[] {
    this.pruneAndRefresh();
    return [...this.entries];
  }

  public filterToOpenTabs(entries: readonly RecentTabEntry[]): RecentTabEntry[] {
    const openTabs = this.collectOpenTextTabs();
    const filtered: RecentTabEntry[] = [];
    const seen = new Set<string>();

    for (const entry of entries) {
      const openTab = openTabs.get(entry.key);
      if (!openTab || seen.has(entry.key)) {
        continue;
      }

      filtered.push(this.toEntry(openTab));
      seen.add(entry.key);
    }

    return filtered;
  }

  private seedInitialEntries(): void {
    const openTabs = [...this.collectOpenTextTabs().values()].sort((left, right) => left.order - right.order);
    this.entries = openTabs.slice(0, this.maxEntries).map((tab) => this.toEntry(tab));
  }

  private recordEditor(editor: vscode.TextEditor): void {
    const openTabs = this.collectOpenTextTabs();
    const key = this.keyForUri(editor.document.uri);
    const current = openTabs.get(key) ?? this.toOpenTextTab(editor.document.uri, editor.viewColumn, -1);
    const preserved = this.entries.filter((entry) => entry.key !== key && openTabs.has(entry.key));

    this.entries = [this.toEntry(current), ...preserved].slice(0, this.maxEntries);
    this.pruneAndRefresh();
  }

  private pruneAndRefresh(): void {
    const openTabs = this.collectOpenTextTabs();
    const seen = new Set<string>();
    const refreshed: RecentTabEntry[] = [];

    for (const entry of this.entries) {
      const openTab = openTabs.get(entry.key);
      if (!openTab || seen.has(entry.key)) {
        continue;
      }

      refreshed.push(this.toEntry(openTab));
      seen.add(entry.key);
    }

    const fallbackTabs = [...openTabs.values()].sort((left, right) => left.order - right.order);
    for (const openTab of fallbackTabs) {
      if (refreshed.length >= this.maxEntries) {
        break;
      }

      if (seen.has(openTab.key)) {
        continue;
      }

      refreshed.push(this.toEntry(openTab));
      seen.add(openTab.key);
    }

    this.entries = refreshed;
  }

  private collectOpenTextTabs(): Map<string, OpenTextTab> {
    const openTabs = new Map<string, OpenTextTab>();
    let order = 0;

    for (const group of vscode.window.tabGroups.all) {
      for (const tab of group.tabs) {
        if (!(tab.input instanceof vscode.TabInputText)) {
          continue;
        }

        const candidate = this.toOpenTextTab(tab.input.uri, group.viewColumn, order++);
        const existing = openTabs.get(candidate.key);
        if (!existing || tab.isActive) {
          openTabs.set(candidate.key, candidate);
        }
      }
    }

    const activeEditor = vscode.window.activeTextEditor;
    if (activeEditor) {
      const activeCandidate = this.toOpenTextTab(activeEditor.document.uri, activeEditor.viewColumn, -1);
      openTabs.set(activeCandidate.key, activeCandidate);
    }

    return openTabs;
  }

  private toOpenTextTab(uri: vscode.Uri, viewColumn: vscode.ViewColumn | undefined, order: number): OpenTextTab {
    return {
      key: this.keyForUri(uri),
      uri,
      label: this.getLabel(uri),
      description: this.getDescription(uri),
      viewColumn,
      order,
    };
  }

  private toEntry(tab: OpenTextTab): RecentTabEntry {
    return {
      key: tab.key,
      uri: tab.uri,
      label: tab.label,
      description: tab.description,
      viewColumn: tab.viewColumn,
    };
  }

  private keyForUri(uri: vscode.Uri): string {
    return uri.toString(true);
  }

  private getLabel(uri: vscode.Uri): string {
    const baseName = path.basename(uri.path);
    if (baseName) {
      return baseName;
    }

    if (uri.scheme === 'untitled') {
      return uri.path.split('/').pop() ?? 'Untitled';
    }

    return uri.toString(true);
  }

  private getDescription(uri: vscode.Uri): string {
    if (uri.scheme === 'untitled') {
      return 'Unsaved file';
    }

    const fsPath = uri.fsPath;
    if (!fsPath) {
      return uri.scheme;
    }

    const folderPath = path.dirname(fsPath);
    if (!folderPath || folderPath === '.') {
      return uri.scheme;
    }

    return vscode.workspace.asRelativePath(folderPath, false);
  }
}
