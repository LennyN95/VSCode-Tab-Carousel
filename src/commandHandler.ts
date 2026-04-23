import * as vscode from 'vscode';

import { RecentTabTracker } from './mruTracker';
import { QuickPickUi } from './quickPickUi';
import { SessionState } from './sessionState';
import { RecentTabEntry } from './types';

export class CycleRecentTabsCommand {
  public constructor(
    private readonly tracker: RecentTabTracker,
    private readonly session: SessionState,
    private readonly quickPickUi: QuickPickUi,
  ) {}

  public async execute(): Promise<void> {
    const doublePressThresholdMs = this.getDoublePressThresholdMs();

    if (this.session.hasActiveSession()) {
      this.session.advanceSelection();
      this.quickPickUi.applySelection(this.session);
      return;
    }

    const pendingCycle = this.session.getPendingCycle();
    if (pendingCycle) {
      await this.beginCyclingSession(pendingCycle.entries, pendingCycle.selectionIndex);
      return;
    }

    const recentTabs = this.tracker.getRecentTabs();
    if (recentTabs.length < 2) {
      this.session.clearPendingCycle();
      return;
    }

    this.session.startPendingCycle(recentTabs, 0, doublePressThresholdMs);
    await this.openTab(recentTabs[1]);
  }

  private async beginCyclingSession(
    pendingEntries: readonly RecentTabEntry[],
    currentSelectionIndex: number,
  ): Promise<void> {
    const recentTabs = this.tracker.filterToOpenTabs(pendingEntries);
    if (!recentTabs.length) {
      this.session.clearPendingCycle();
      return;
    }

    const startingItem = recentTabs[currentSelectionIndex];
    if (startingItem) {
      await this.openTab(startingItem);
    }

    this.quickPickUi.createQuickPick(recentTabs, this.session, currentSelectionIndex, {
      onAccept: () => {
        void this.commitSelection();
      },
      onHide: () => {
        if (this.session.isCommitting()) {
          return;
        }

        if (this.session.shouldCommitOnHide()) {
          void this.commitSelection();
          return;
        }

        this.session.reset();
      },
      onActiveItemChanged: (index) => {
        this.session.setSelectionIndex(index);
      },
    });
  }

  private getDoublePressThresholdMs(): number {
    const configured = vscode.workspace.getConfiguration('tabCarousel').get<number>('doublePressThresholdMs', 333);
    if (typeof configured !== 'number' || !Number.isFinite(configured)) {
      return 333;
    }

    return Math.max(100, Math.round(configured));
  }

  private async commitSelection(): Promise<void> {
    const selectedItem = this.session.getSelectedItem();
    const quickPick = this.session.getQuickPick();
    if (!selectedItem || !quickPick || !this.session.markCommitting()) {
      return;
    }

    try {
      await this.openTab(selectedItem.tab);
    } finally {
      quickPick.hide();
      this.session.reset();
    }
  }

  private async openTab(tab: RecentTabEntry): Promise<void> {
    const document = await vscode.workspace.openTextDocument(tab.uri);
    await vscode.window.showTextDocument(document, {
      preview: false,
      preserveFocus: false,
      viewColumn: tab.viewColumn,
    });
  }
}
