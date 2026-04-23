import * as vscode from 'vscode';

import { RecentTabEntry } from './types';

export interface RecentTabQuickPickItem extends vscode.QuickPickItem {
  readonly tab: RecentTabEntry;
}

interface PendingCycle {
  readonly entries: RecentTabEntry[];
  selectionIndex: number;
}

export class SessionState implements vscode.Disposable {
  private quickPick: vscode.QuickPick<RecentTabQuickPickItem> | undefined;
  private items: RecentTabQuickPickItem[] = [];
  private selectionIndex = -1;
  private pendingCycle: PendingCycle | undefined;
  private pendingCycleHandle: NodeJS.Timeout | undefined;
  private commitOnHide = true;
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
    this.clearPendingCycle();
    this.quickPick = quickPick;
    this.items = items;
    this.selectionIndex = this.normalizeIndex(initialSelectionIndex);
    this.commitOnHide = true;
    this.committing = false;
    void vscode.commands.executeCommand('setContext', 'tabCarousel.sessionActive', true);
  }

  public reset(): void {
    this.clearPendingCycle();
    const quickPick = this.quickPick;
    this.quickPick = undefined;
    this.items = [];
    this.selectionIndex = -1;
    this.commitOnHide = true;
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

  public markCommitting(): boolean {
    if (this.committing) {
      return false;
    }

    this.committing = true;
    return true;
  }

  public isCommitting(): boolean {
    return this.committing;
  }

  public shouldCommitOnHide(): boolean {
    return this.commitOnHide;
  }

  public markDismissWithoutCommit(): void {
    this.commitOnHide = false;
  }

  public startPendingCycle(
    entries: RecentTabEntry[],
    selectionIndex: number,
    timeoutMs: number,
  ): void {
    this.clearPendingCycle();
    this.pendingCycle = {
      entries,
      selectionIndex: this.normalizePendingIndex(selectionIndex, entries.length),
    };
    this.pendingCycleHandle = setTimeout(() => {
      this.pendingCycle = undefined;
      this.pendingCycleHandle = undefined;
    }, timeoutMs);
  }

  public getPendingCycle(): PendingCycle | undefined {
    return this.pendingCycle;
  }

  public clearPendingCycle(): void {
    if (this.pendingCycleHandle) {
      clearTimeout(this.pendingCycleHandle);
      this.pendingCycleHandle = undefined;
    }

    this.pendingCycle = undefined;
  }

  private normalizeIndex(index: number): number {
    if (!this.items.length) {
      return -1;
    }

    const length = this.items.length;
    return ((index % length) + length) % length;
  }

  private normalizePendingIndex(index: number, length: number): number {
    if (!length) {
      return -1;
    }

    return ((index % length) + length) % length;
  }
}
