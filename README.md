# Tab Carousel

Tab Carousel is a lightweight VS Code extension that lets you switch between your most recently used editor tabs with `Cmd+E`.

It keeps a short MRU list of recent open editor tabs, defaulting to five. A single `Cmd+E` switches to the previous tab immediately. If a second `Cmd+E` follows quickly, the extension returns to the tab where you started, opens a minimal `QuickPick`, and then continues cycling inside that frozen snapshot.

## Features

- Tracks a configurable number of most recently active open editor tabs, with a default of 5.
- Supports regular text editors, diff editors, notebooks, notebook diffs, and custom editors.
- A single `Cmd+E` switches to the previously active tab immediately.
- A rapid second `Cmd+E` opens a `QuickPick` and enters cycling mode.
- Reuses the same `QuickPick` session while you keep pressing `Cmd+E`.
- Wraps selection when cycling past the end of the list.
- Lets you move the active selection with the mouse without opening a tab immediately.
- Commits the current selection when you press `Enter`, press `Escape`, or otherwise dismiss the picker.
- Closes the picker without switching if you type into the QuickPick input field.
- The input placeholder makes it clear that typing cancels the carousel.

## Usage

1. Open at least two text editor tabs.
2. Press `Cmd+E`.
3. The extension immediately switches to your previously active tab.
4. Press `Cmd+E` again quickly to return to where you started and open the picker on that tab.
5. Keep pressing `Cmd+E` to move the selection to the right through the list.
6. Press `Enter`, press `Escape`, or click an item to open the selected tab.
7. Type any key into the QuickPick input to dismiss the carousel without switching.

## Cycling Behavior

The switcher preserves a short-lived MRU snapshot so it can distinguish a quick toggle from an intentional cycling session:

- First `Cmd+E`: capture the MRU snapshot, start a short double-press window, and switch immediately to the previous tab.
- Second `Cmd+E` within the double-press window: return to the tab where you started and open the picker on that tab from the remembered snapshot.
- Each additional `Cmd+E`: advance the active selection by one from that current-tab starting point.
- When the end of the list is reached, the selection wraps back to the beginning.
- Mouse hover updates the active selection.
- Dismissing the picker commits the current selection unless the dismissal was caused by typed input.
- Typing any filter text dismisses the picker without switching tabs.

## Configuration

- `tabCarousel.maxTabs`: maximum number of recent tabs to keep in the carousel list. Default: `5`.
- `tabCarousel.doublePressThresholdMs`: maximum delay in milliseconds between the first and second `Cmd+E` press to enter cycling mode. Default: `333`.

## Implementation Notes

- The extension uses `window.createQuickPick()` rather than the one-shot `showQuickPick()` API so a single picker instance can remain open across repeated command invocations.
- MRU tracking is maintained separately from UI state and refreshed against currently open tabs to avoid stale entries.
- Only valid, currently open editor tabs are included in the picker.
- Reopenable tab kinds are included in the picker; transient tabs such as terminals and arbitrary webviews are skipped.
- Duplicate entries are removed by URI.

## Commands

- `Tab Carousel: Cycle Recent Tabs` (`tabCarousel.cycleRecentTabs`)

## Default Keybinding

- macOS: `Cmd+E`
