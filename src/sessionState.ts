import * as vscode from 'vscode';

import { RecentTabEntry } from './types';

export interface RecentTabQuickPickItem extends vscode.QuickPickItem {
  readonly tab: RecentTabEntry;
}

export class SessionState implements vscode.Disposable {
  private quickPick: vscode.QuickPick<RecentTabQuickPickItem> | undefined;
  private items: RecentTabQuickPickItem[] = [];
  private selectionIndex = -1;
  private autoCommitHandle: NodeJS.Timeout | undefined;
  private committing = false;

  public dispose(): void {
    this.reset();
  }

  public hasActiveSession(): boolean {
    return this.quickPick !== undefined;
  }

  public begin(
    quickPick: vscode.QuickPick<RecentTabQuickPickItem>,
    items: RecentTabQuickPickItem[],
    initialSelectionIndex: number,
  ): void {
    this.quickPick = quickPick;
    this.items = items;
    this.selectionIndex = this.normalizeIndex(initialSelectionIndex);
    this.committing = false;
    void vscode.commands.executeCommand('setContext', 'tabCarousel.sessionActive', true);
  }

  public reset(): void {
    this.cancelAutoCommit();
    const quickPick = this.quickPick;
    this.quickPick = undefined;
    this.items = [];
    this.selectionIndex = -1;
    this.committing = false;
    void vscode.commands.executeCommand('setContext', 'tabCarousel.sessionActive', false);
    quickPick?.dispose();
  }

  public getQuickPick(): vscode.QuickPick<RecentTabQuickPickItem> | undefined {
    return this.quickPick;
  }

  public getItems(): readonly RecentTabQuickPickItem[] {
    return this.items;
  }

  public getSelectionIndex(): number {
    return this.selectionIndex;
  }

  public setSelectionIndex(index: number): RecentTabQuickPickItem | undefined {
    if (!this.items.length) {
      this.selectionIndex = -1;
      return undefined;
    }

    this.selectionIndex = this.normalizeIndex(index);
    return this.items[this.selectionIndex];
  }

  public advanceSelection(step = 1): RecentTabQuickPickItem | undefined {
    return this.setSelectionIndex(this.selectionIndex + step);
  }

  public getSelectedItem(): RecentTabQuickPickItem | undefined {
    if (this.selectionIndex < 0 || this.selectionIndex >= this.items.length) {
      return undefined;
    }

    return this.items[this.selectionIndex];
  }

  public scheduleAutoCommit(delayMs: number, callback: () => void): void {
    this.cancelAutoCommit();
    this.autoCommitHandle = setTimeout(() => {
      this.autoCommitHandle = undefined;
      callback();
    }, delayMs);
  }

  public cancelAutoCommit(): void {
    if (this.autoCommitHandle) {
      clearTimeout(this.autoCommitHandle);
      this.autoCommitHandle = undefined;
    }
  }

  public markCommitting(): boolean {
    if (this.committing) {
      return false;
    }

    this.committing = true;
    return true;
  }

  private normalizeIndex(index: number): number {
    if (!this.items.length) {
      return -1;
    }

    const length = this.items.length;
    return ((index % length) + length) % length;
  }
}
