// SPDX-License-Identifier: GPL-3.0-or-later

import Meta from 'gi://Meta';
import Shell from 'gi://Shell';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';

import {ZoomController} from './zoomController.js';

const KEY_ZOOM = 'hotkey-zoom';
const KEY_FOLLOW = 'hotkey-follow';
const MODES = Shell.ActionMode.NORMAL | Shell.ActionMode.OVERVIEW;

export default class ZoomInGnome extends Extension {
    enable() {        
        this._settings = this.getSettings();
        this._controller = new ZoomController(this._settings);

        Main.wm.addKeybinding(KEY_ZOOM, this._settings, Meta.KeyBindingFlags.NONE, MODES,
            () => this._controller.toggle());
        Main.wm.addKeybinding(KEY_FOLLOW, this._settings, Meta.KeyBindingFlags.NONE, MODES,
            () => this._controller.toggleFollow());
    }

    disable() {
        Main.wm.removeKeybinding(KEY_ZOOM);
        Main.wm.removeKeybinding(KEY_FOLLOW);

        this._controller?.destroy();
        this._controller = null;
        this._settings = null;
    }
}
