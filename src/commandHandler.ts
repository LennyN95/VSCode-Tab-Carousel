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
    private readonly autoCommitDelayMs = 400,
  ) {}

  public async execute(): Promise<void> {
    if (this.session.hasActiveSession()) {
      this.session.advanceSelection();
      this.quickPickUi.applySelection(this.session);
      this.armAutoCommit();
      return;
    }

    const recentTabs = this.tracker.getRecentTabs();
    if (recentTabs.length < 2) {
      return;
    }

    this.quickPickUi.createQuickPick(recentTabs, this.session, 1, {
      onAccept: () => {
        void this.commitSelection();
      },
      onHide: () => {
        this.session.reset();
      },
      onActiveItemChanged: (index) => {
        this.session.setSelectionIndex(index);
      },
    });

    this.armAutoCommit();
  }

  private armAutoCommit(): void {
    this.session.scheduleAutoCommit(this.autoCommitDelayMs, () => {
      void this.commitSelection();
    });
  }

  private async commitSelection(): Promise<void> {
    const selectedItem = this.session.getSelectedItem();
    const quickPick = this.session.getQuickPick();
    if (!selectedItem || !quickPick || !this.session.markCommitting()) {
      return;
    }

    this.session.cancelAutoCommit();

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
