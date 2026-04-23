import * as path from 'node:path';
import * as vscode from 'vscode';

import { RecentTabEntry } from './types';

type OpenTabEntry = RecentTabEntry & {
  readonly order: number;
};

export class RecentTabTracker implements vscode.Disposable {
  private readonly disposables: vscode.Disposable[] = [];
  private entries: RecentTabEntry[] = [];
  private lastActiveKey: string | undefined;

  public constructor(private readonly maxEntries = 5) {
    this.seedInitialEntries();

    this.disposables.push(
      vscode.window.onDidChangeActiveTextEditor(() => {
        this.syncActiveTab();
      }),
      vscode.window.onDidChangeActiveNotebookEditor(() => {
        this.syncActiveTab();
      }),
      vscode.window.tabGroups.onDidChangeTabs(() => {
        this.syncActiveTab();
      }),
      vscode.window.tabGroups.onDidChangeTabGroups(() => {
        this.syncActiveTab();
      }),
    );

    this.syncActiveTab();
  }

  public dispose(): void {
    vscode.Disposable.from(...this.disposables).dispose();
  }

  public getRecentTabs(): RecentTabEntry[] {
    this.pruneAndRefresh();
    return [...this.entries];
  }

  public filterToOpenTabs(entries: readonly RecentTabEntry[]): RecentTabEntry[] {
    const openTabs = this.collectOpenTabs();
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
    const openTabs = [...this.collectOpenTabs().values()].sort((left, right) => left.order - right.order);
    this.entries = openTabs.slice(0, this.maxEntries).map((tab) => this.toEntry(tab));
  }

  private syncActiveTab(): void {
    const activeTab = vscode.window.tabGroups.activeTabGroup.activeTab;
    const activeKey = activeTab ? this.keyForInput(activeTab.input) : undefined;

    if (!activeTab || !activeKey) {
      this.lastActiveKey = undefined;
      this.pruneAndRefresh();
      return;
    }

    if (activeKey === this.lastActiveKey) {
      this.pruneAndRefresh();
      return;
    }

    this.lastActiveKey = activeKey;
    this.recordTab(activeTab);
  }

  private recordTab(tab: vscode.Tab): void {
    const openTabs = this.collectOpenTabs();
    const key = this.keyForInput(tab.input);
    if (!key) {
      this.pruneAndRefresh();
      return;
    }

    const current = openTabs.get(key);
    if (!current) {
      this.pruneAndRefresh();
      return;
    }

    const preserved = this.entries.filter((entry) => entry.key !== key && openTabs.has(entry.key));

    this.entries = [this.toEntry(current), ...preserved].slice(0, this.maxEntries);
    this.pruneAndRefresh();
  }

  private pruneAndRefresh(): void {
    const openTabs = this.collectOpenTabs();
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

  private collectOpenTabs(): Map<string, OpenTabEntry> {
    const openTabs = new Map<string, OpenTabEntry>();
    let order = 0;

    for (const group of vscode.window.tabGroups.all) {
      for (const tab of group.tabs) {
        const candidate = this.toOpenTabEntry(tab, group.viewColumn, order++);
        if (!candidate) {
          continue;
        }

        const existing = openTabs.get(candidate.key);
        if (!existing || tab.isActive) {
          openTabs.set(candidate.key, candidate);
        }
      }
    }

    return openTabs;
  }

  private toOpenTabEntry(tab: vscode.Tab, viewColumn: vscode.ViewColumn | undefined, order: number): OpenTabEntry | undefined {
    const input = tab.input;

    if (input instanceof vscode.TabInputText) {
      const key = `text:${input.uri.toString(true)}`;
      return {
        kind: 'text',
        key,
        uri: input.uri,
        label: this.getLabel(input.uri),
        description: this.getSingleDescription(input.uri),
        viewColumn,
        order,
      };
    }

    if (input instanceof vscode.TabInputTextDiff) {
      const key = `textDiff:${input.original.toString(true)}::${input.modified.toString(true)}`;
      return {
        kind: 'textDiff',
        key,
        original: input.original,
        modified: input.modified,
        label: tab.label,
        description: this.getDiffDescription(input.original, input.modified),
        viewColumn,
        order,
      };
    }

    if (input instanceof vscode.TabInputCustom) {
      const key = `custom:${input.viewType}:${input.uri.toString(true)}`;
      return {
        kind: 'custom',
        key,
        uri: input.uri,
        viewType: input.viewType,
        label: tab.label || this.getLabel(input.uri),
        description: this.getSingleDescription(input.uri),
        viewColumn,
        order,
      };
    }

    if (input instanceof vscode.TabInputNotebook) {
      const key = `notebook:${input.notebookType}:${input.uri.toString(true)}`;
      return {
        kind: 'notebook',
        key,
        uri: input.uri,
        notebookType: input.notebookType,
        label: this.getLabel(input.uri),
        description: this.getSingleDescription(input.uri),
        viewColumn,
        order,
      };
    }

    if (input instanceof vscode.TabInputNotebookDiff) {
      const key = `notebookDiff:${input.notebookType}:${input.original.toString(true)}::${input.modified.toString(true)}`;
      return {
        kind: 'notebookDiff',
        key,
        original: input.original,
        modified: input.modified,
        notebookType: input.notebookType,
        label: tab.label,
        description: this.getDiffDescription(input.original, input.modified),
        viewColumn,
        order,
      };
    }

    return undefined;
  }

  private toEntry(tab: OpenTabEntry): RecentTabEntry {
    switch (tab.kind) {
      case 'text':
        return {
          kind: 'text',
          key: tab.key,
          uri: tab.uri,
          label: tab.label,
          description: tab.description,
          viewColumn: tab.viewColumn,
        };
      case 'textDiff':
        return {
          kind: 'textDiff',
          key: tab.key,
          original: tab.original,
          modified: tab.modified,
          label: tab.label,
          description: tab.description,
          viewColumn: tab.viewColumn,
        };
      case 'custom':
        return {
          kind: 'custom',
          key: tab.key,
          uri: tab.uri,
          viewType: tab.viewType,
          label: tab.label,
          description: tab.description,
          viewColumn: tab.viewColumn,
        };
      case 'notebook':
        return {
          kind: 'notebook',
          key: tab.key,
          uri: tab.uri,
          notebookType: tab.notebookType,
          label: tab.label,
          description: tab.description,
          viewColumn: tab.viewColumn,
        };
      case 'notebookDiff':
        return {
          kind: 'notebookDiff',
          key: tab.key,
          original: tab.original,
          modified: tab.modified,
          notebookType: tab.notebookType,
          label: tab.label,
          description: tab.description,
          viewColumn: tab.viewColumn,
        };
    }
  }

  private keyForInput(input: vscode.Tab['input']): string | undefined {
    if (input instanceof vscode.TabInputText) {
      return `text:${input.uri.toString(true)}`;
    }

    if (input instanceof vscode.TabInputTextDiff) {
      return `textDiff:${input.original.toString(true)}::${input.modified.toString(true)}`;
    }

    if (input instanceof vscode.TabInputCustom) {
      return `custom:${input.viewType}:${input.uri.toString(true)}`;
    }

    if (input instanceof vscode.TabInputNotebook) {
      return `notebook:${input.notebookType}:${input.uri.toString(true)}`;
    }

    if (input instanceof vscode.TabInputNotebookDiff) {
      return `notebookDiff:${input.notebookType}:${input.original.toString(true)}::${input.modified.toString(true)}`;
    }

    return undefined;
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

  private getSingleDescription(uri: vscode.Uri): string {
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

  private getDiffDescription(original: vscode.Uri, modified: vscode.Uri): string {
    return `${this.getSingleDescription(original)} \u2194 ${this.getSingleDescription(modified)}`;
  }
}
