import * as vscode from 'vscode';

import { SessionState, RecentTabQuickPickItem } from './sessionState';
import { RecentTabEntry } from './types';

interface QuickPickCallbacks {
  readonly onAccept: () => void;
  readonly onHide: () => void;
  readonly onActiveItemChanged: (index: number) => void;
}

export class QuickPickUi {
  public createQuickPick(
    entries: readonly RecentTabEntry[],
    session: SessionState,
    initialSelectionIndex: number,
    callbacks: QuickPickCallbacks,
  ): vscode.QuickPick<RecentTabQuickPickItem> {
    const quickPick = vscode.window.createQuickPick<RecentTabQuickPickItem>();
    const items: RecentTabQuickPickItem[] = entries.map((tab) => ({
      label: tab.label,
      description: tab.description,
      tab,
    }));

    quickPick.title = 'Recent Tabs';
    quickPick.placeholder = 'Press Cmd+E to cycle, Enter to switch, Escape to cancel';
    quickPick.ignoreFocusOut = true;
    quickPick.matchOnDescription = false;
    quickPick.matchOnDetail = false;
    quickPick.items = items;

    quickPick.onDidChangeValue(() => {
      if (quickPick.value.length > 0) {
        quickPick.value = '';
      }
    });

    quickPick.onDidChangeActive((activeItems) => {
      const activeItem = activeItems[0];
      if (!activeItem) {
        return;
      }

      const index = items.indexOf(activeItem);
      if (index >= 0) {
        callbacks.onActiveItemChanged(index);
      }
    });

    quickPick.onDidAccept(() => {
      callbacks.onAccept();
    });

    quickPick.onDidHide(() => {
      callbacks.onHide();
    });

    session.begin(quickPick, items, initialSelectionIndex);
    quickPick.show();
    this.applySelection(session);

    return quickPick;
  }

  public applySelection(session: SessionState): void {
    const quickPick = session.getQuickPick();
    const selectedItem = session.getSelectedItem();

    if (!quickPick || !selectedItem) {
      return;
    }

    quickPick.activeItems = [selectedItem];
  }
}
