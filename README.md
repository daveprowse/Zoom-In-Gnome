# Zoom In Gnome

Zoom in on **one monitor** of your GNOME™ desktop with a single keystroke. The monitor under your
pointer gets magnified, and every other monitor stays exactly as it was.

Press **Super+Z** to zoom in, and press it again to zoom out.

This extension is brand new (Nov, 2026) so if you have any issues please post them here.

## Why this exists

GNOME's built-in zoom magnifies every screen at once (by default). That's a problem if you present, teach,
record or stream from a multi-monitor setup, where you want the audience's screen magnified while
your notes, chat and controls stay put on the others.

Zoom In Gnome is built around three goals:

- **Single-monitor zoom.** Only the monitor your pointer is on is magnified. The rest of the
  desktop is untouched, so a capture of another monitor in OBS (or any recorder) stays at normal size.
- **A steady view by default.** The view does not move when you move the pointer. That is the right
  behavior for presenters, who need to hold a diagram still while they talk about it. The view
  only pans when the pointer nears the edge of the monitor. Following the pointer is available as a
  toggle (Super+X) or as a setting.
- **The pointer still works normally.** Clicking, dragging, highlighting text, drawing with a stylus
  or an annotation tool such as [Draw On Gnome](https://github.com/daveprowse/Draw-On-Gnome) all land where you see them, even while zoomed.

## Hotkeys

| Hotkey      | Action                                                          |
| ----------- | --------------------------------------------------------------- |
| `<Super>+Z` | Zoom the monitor under the pointer in or out                    |
| `<Super>+X` | While zoomed, switch between a steady view and following the pointer |

Both can be changed in the preferences window.

## Compatibility

GNOME Shell **46 to 51**, on Wayland and X11.

Tested on:

- GNOME 46 (X11), with four monitors of mixed sizes
- GNOME 49 (Fedora)
- GNOME 51 (Manjaro, Wayland), including a two-display setup

GNOME 47, 48 and 50 should behave like their neighbors but have not been tested yet.

## Install

**From the GNOME Extensions website (recommended).** Search for "Zoom In Gnome" on
[extensions.gnome.org](https://extensions.gnome.org) or in the Extensions app, and switch it on.

**From a release zip:**

```bash
gnome-extensions install --force zoom-in-gnome@daveprowse.github.io.zip
gnome-extensions enable zoom-in-gnome@daveprowse.github.io
```

A newly installed extension is only loaded by a fresh shell, so log out and back in. On X11 up to
GNOME 48 you can instead press `Alt+F2`, type `r` and press Enter.

Open the preferences with:

```bash
gnome-extensions prefs zoom-in-gnome@daveprowse.github.io
```

## Settings

| Setting                          | Default        | What it does                                                          |
| -------------------------------- | -------------- | --------------------------------------------------------------------- |
| Zoom level                       | 2.0            | Magnification, from 1.25 to 8                                         |
| Animation duration               | 250 ms         | 0 for instant                                                         |
| Follow the cursor when zooming in | Off           | Start each zoom following the pointer instead of holding a steady view |
| Software cursor                  | On             | Keeps clicks and highlighting lined up while the view is steady (see below) |
| Drawn cursor while following     | Auto           | Draw our own cursor while following. Auto does this on GNOME 49 and older, where the system cursor can disappear |
| Follow smoothing                 | 1.0            | 1.0 keeps content exactly under the pointer; lower values glide but lag |
| Shortcuts                        | Super+Z, Super+X | Type an accelerator such as `<Super>z` and press Enter              |

## Good to know

- When the view is steady, Zoom In Gnome hides the system cursor and draws its own, so that
  clicking and highlighting land where you see them. This drawn cursor is always an arrow and
  moves faster than your hand, by the zoom factor (twice as fast at 2×). 
  > Note: In follow mode on
  GNOME 50 and newer the normal system cursor is used, so it changes shape as usual.
- The view only pans when the pointer gets close to the monitor's edge.

## If something goes wrong

- **Clicks or highlighting stop working, or the cursor looks wrong:** open the preferences and
  turn off **Software cursor**. You'll get plain zoom back, without the drawn cursor.
- **You can't get out of the zoom:** press **Super+Z** again. The shortcut works even if the
  pointer isn't responding.
- **Look at the log:** problems are logged with a `[Z.I.G.]` prefix:
  `journalctl -b -o cat /usr/bin/gnome-shell | grep "Z.I.G."`
- **Reporting a bug:** include your GNOME version, whether you're on Wayland or X11, how many
  monitors you have, and the log lines above.
- If the cursor misbehaves on your system, turn off **Software cursor** in the preferences to
  get the plain zoom back.

Any problem is logged with a `[Z.I.G.]` prefix, which you can find with:

```bash
journalctl -b -o cat /usr/bin/gnome-shell | grep "Z.I.G."
```

## License

GPL-3.0-or-later. See `LICENSE`.

## Credits

Inspired by GNOME's built-in Zoom (the Shell's accessibility screen magnifier) and by
[smoothzoom](https://github.com/kevinchappell/smoothzoom) by Kevin Chappell.