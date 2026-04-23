# Tab Carousel

Tab Carousel is a lightweight VS Code extension that lets you switch between your most recently used editor tabs with `Cmd+E`.

It keeps a short MRU list of up to five open text-editor tabs, opens a minimal `QuickPick` UI on the first keypress, and lets you continue cycling through the same list with repeated `Cmd+E` presses.

## Features

- Tracks up to 5 most recently active open editor tabs.
- Opens a `QuickPick` on the first `Cmd+E`.
- Preselects the previously active tab when at least two tabs are available.
- Reuses the same `QuickPick` session while you keep pressing `Cmd+E`.
- Wraps selection when cycling past the end of the list.
- Lets you move the active selection with the mouse without opening a tab immediately.
- Commits the current selection on `Enter` or after a short inactivity timeout.
- Cancels cleanly on `Escape`.

## Usage

1. Open at least two text editor tabs.
2. Press `Cmd+E`.
3. The picker shows up to five recent tabs, with the second item preselected so the default target is your previously active tab.
4. Keep pressing `Cmd+E` to move the selection to the right through the list.
5. Press `Enter` to open the selected tab, or stop pressing keys and let the inactivity timeout switch automatically.
6. Press `Escape` to close the picker without switching.

## Cycling Behavior

The switcher is stateful for the duration of an open picker session:

- First `Cmd+E`: open the picker and select the previous tab.
- Each additional `Cmd+E`: advance the active selection by one.
- When the end of the list is reached, the selection wraps back to the beginning.
- Mouse hover updates the active selection so the timeout or `Enter` will use the hovered item.

## Timeout-Based Auto-Selection

Each `Cmd+E` press resets a 400 ms inactivity timer.

If no further `Cmd+E` press happens before that timer expires, the extension automatically opens the currently active picker item. This makes the interaction feel similar to fast tab switching workflows where you tap to cycle and pause to commit.

## Implementation Notes

- The extension uses `window.createQuickPick()` rather than the one-shot `showQuickPick()` API so a single picker instance can remain open across repeated command invocations.
- MRU tracking is maintained separately from UI state and refreshed against currently open tabs to avoid stale entries.
- Only valid, currently open text editor tabs are included in the picker.
- Duplicate entries are removed by URI.

## Commands

- `Tab Carousel: Cycle Recent Tabs` (`tabCarousel.cycleRecentTabs`)

## Default Keybinding

- macOS: `Cmd+E`
