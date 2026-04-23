import * as vscode from 'vscode';

import { CycleRecentTabsCommand } from './commandHandler';
import { RecentTabTracker } from './mruTracker';
import { QuickPickUi } from './quickPickUi';
import { SessionState } from './sessionState';

export function activate(context: vscode.ExtensionContext): void {
  const tracker = new RecentTabTracker(5);
  const session = new SessionState();
  const quickPickUi = new QuickPickUi();
  const command = new CycleRecentTabsCommand(tracker, session, quickPickUi);

  context.subscriptions.push(
    tracker,
    session,
    vscode.commands.registerCommand('tabCarousel.cycleRecentTabs', async () => {
      await command.execute();
    }),
  );
}

export function deactivate(): void {
  // VS Code disposes subscriptions for us. Nothing else is required here.
}
