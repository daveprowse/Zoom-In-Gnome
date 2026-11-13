// SPDX-License-Identifier: GPL-3.0-or-later

import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';
import Meta from 'gi://Meta';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as Config from 'resource:///org/gnome/shell/misc/config.js';

import {SoftCursor} from './softCursor.js';

const FRAME_MS = 16;
const EDGE_MARGIN = 48;

const clamp = (value, lo, hi) => Math.min(Math.max(value, lo), hi);

export function shellMajorVersion() {
    const major = Number.parseInt(String(Config.PACKAGE_VERSION).split('.')[0], 10);
    return Number.isNaN(major) ? 0 : major;
}

function setUnredirect(enable) {
    try {
        const compositor = global.compositor;
        if (compositor) {
            const fn = enable ? compositor.enable_unredirect : compositor.disable_unredirect;
            if (typeof fn === 'function') {
                fn.call(compositor);
                return true;
            }
        }
        const nsFn = enable
            ? Meta.enable_unredirect_for_display
            : Meta.disable_unredirect_for_display;
        if (typeof nsFn === 'function') {
            nsFn(global.display);
            return true;
        }
    } catch (e) {
        console.warn(`[Z.I.G.] could not ${enable ? 'enable' : 'disable'} unredirect: ${e}`);
    }
    return false;
}

export class ZoomController {
    constructor(settings) {
        this._settings = settings;
        this._state = 'idle';
        this._generation = 0;
        this._follow = false;
        this._wrapper = null;
        this._clone = null;
        this._monitor = null;
        this._pivot = {x: 0, y: 0};
        this._tickId = 0;
        this._unredirectDisabled = false;
        this._soft = null;

        this._monitorsChangedId = Main.layoutManager.connect('monitors-changed',
            () => this._teardown());
    }

    get isZoomed() {
        return this._state === 'in' || this._state === 'zoomed';
    }

    toggle() {
        if (this.isZoomed)
            this._zoomOut();
        else
            this._zoomIn();
    }

    toggleFollow() {
        if (this._state === 'idle')
            return;
        this._follow = !this._follow;
    }

    destroy() {
        this._teardown();
        if (this._monitorsChangedId) {
            Main.layoutManager.disconnect(this._monitorsChangedId);
            this._monitorsChangedId = 0;
        }
        this._settings = null;
    }

    _zoomIn() {
        const level = this._settings.get_double('zoom-level');
        const duration = this._settings.get_int('zoom-duration-ms');

        if (this._state === 'idle') {
            this._build(this._pickMonitor());
            this._follow = this._settings.get_boolean('follow-default-on');
            this._unredirectDisabled = setUnredirect(false);
            this._startTick();
        }

        const generation = ++this._generation;
        this._state = 'in';
        this._clone.ease({
            scale_x: level,
            scale_y: level,
            duration,
            mode: Clutter.AnimationMode.EASE_OUT_CUBIC,
            onComplete: () => {
                if (generation === this._generation)
                    this._state = 'zoomed';
            },
        });
    }

    _zoomOut() {
        if (!this._clone)
            return;

        const generation = ++this._generation;
        this._state = 'out';
        this._clone.ease({
            scale_x: 1,
            scale_y: 1,
            duration: this._settings.get_int('zoom-duration-ms'),
            mode: Clutter.AnimationMode.EASE_OUT_CUBIC,
            onComplete: () => {
                if (generation === this._generation)
                    this._teardown();
            },
        });
    }

    _pickMonitor() {
        const [px, py] = global.get_pointer();
        const monitors = Main.layoutManager.monitors;
        const hit = monitors.find(m =>
            px >= m.x && px < m.x + m.width && py >= m.y && py < m.y + m.height);
        const m = hit ?? Main.layoutManager.primaryMonitor;
        return {x: m.x, y: m.y, width: m.width, height: m.height};
    }

    _build(monitor) {
        this._monitor = monitor;

        this._wrapper = new Clutter.Actor({
            name: 'zig-wrapper',
            reactive: false,
            x: monitor.x,
            y: monitor.y,
            width: monitor.width,
            height: monitor.height,
            clip_to_allocation: true,
        });

        this._clone = new Clutter.Clone({
            name: 'zig-clone',
            reactive: false,
            source: Main.uiGroup,
            x: -monitor.x,
            y: -monitor.y,
            width: global.stage.width,
            height: global.stage.height,
        });

        this._wrapper.add_child(this._clone);
        this._soft = new SoftCursor();
        this._wrapper.add_child(this._soft.actor);
        global.stage.add_child(this._wrapper);

        this._pivot = this._cursorPivot();
        this._applyPivot();
    }

    _teardown() {
        this._generation++;
        this._stopTick();

        if (this._soft) {
            this._soft.release();
            this._soft = null;
        }
        if (this._wrapper) {
            this._wrapper.destroy();
            this._wrapper = null;
            this._clone = null;
        }
        if (this._unredirectDisabled) {
            setUnredirect(true);
            this._unredirectDisabled = false;
        }
        this._monitor = null;
        this._state = 'idle';
    }

    _cursorPivot() {
        const [px, py] = global.get_pointer();
        const m = this._monitor;
        return {
            x: clamp(px, m.x, m.x + m.width),
            y: clamp(py, m.y, m.y + m.height),
        };
    }

    _applyPivot() {
        this._clone.set_pivot_point(
            this._pivot.x / this._clone.width,
            this._pivot.y / this._clone.height);
    }

    _startTick() {
        this._stopTick();
        this._tickId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, FRAME_MS, () => this._tick());
    }

    _stopTick() {
        if (this._tickId) {
            GLib.Source.remove(this._tickId);
            this._tickId = 0;
        }
    }

    _updateFixedView() {
        if (!this._soft || !this._settings.get_boolean('software-cursor')) {
            this._soft?.hide();
            return;
        }

        const [px, py] = global.get_pointer();
        const m = this._monitor;
        const z = this._clone.scale_x;

        if (px < m.x || px >= m.x + m.width || py < m.y || py >= m.y + m.height) {
            this._soft.hide();
            return;
        }

        if (z > 1.001) {
            const margin = Math.min(EDGE_MARGIN, m.width / 4, m.height / 4);
            const x = this._panAxis(this._pivot.x, px, z, m.x, m.width, margin);
            const y = this._panAxis(this._pivot.y, py, z, m.y, m.height, margin);
            if (x !== this._pivot.x || y !== this._pivot.y) {
                this._pivot = {x, y};
                this._applyPivot();
            }
        }

        const sx = this._pivot.x + (px - this._pivot.x) * z;
        const sy = this._pivot.y + (py - this._pivot.y) * z;
        this._soft.place(sx - m.x, sy - m.y);
    }

    _followNeedsSoftCursor() {
        if (!this._soft || !this._settings.get_boolean('software-cursor'))
            return false;
        const mode = this._settings.get_string('follow-cursor');
        if (mode === 'on')
            return true;
        if (mode === 'off')
            return false;
        return shellMajorVersion() < 50;
    }

    _placeSoftCursor() {
        const [px, py] = global.get_pointer();
        const m = this._monitor;
        if (px < m.x || px >= m.x + m.width || py < m.y || py >= m.y + m.height) {
            this._soft.hide();
            return;
        }
        const z = this._clone.scale_x;
        const sx = this._pivot.x + (px - this._pivot.x) * z;
        const sy = this._pivot.y + (py - this._pivot.y) * z;
        this._soft.place(sx - m.x, sy - m.y);
    }

    _panAxis(pivot, p, z, origin, size, margin) {
        const screen = pivot + (p - pivot) * z;
        let next = pivot;
        if (screen < origin + margin)
            next = (z * p - (origin + margin)) / (z - 1);
        else if (screen > origin + size - margin)
            next = (z * p - (origin + size - margin)) / (z - 1);
        return clamp(next, origin, origin + size);
    }

    _tick() {
        if (!this._clone) {
            this._tickId = 0;
            return GLib.SOURCE_REMOVE;
        }
        if (!this._follow) {
            this._updateFixedView();
            return GLib.SOURCE_CONTINUE;
        }
        const softCursor = this._followNeedsSoftCursor();
        if (!softCursor)
            this._soft?.hide();

        const target = this._cursorPivot();
        const k = clamp(this._settings.get_double('follow-smoothing'), 0.01, 1);
        let x = target.x;
        let y = target.y;
        if (k < 1) {
            x = this._pivot.x + (target.x - this._pivot.x) * k;
            y = this._pivot.y + (target.y - this._pivot.y) * k;
            if (Math.abs(target.x - x) < 0.25)
                x = target.x;
            if (Math.abs(target.y - y) < 0.25)
                y = target.y;
        }

        if (x !== this._pivot.x || y !== this._pivot.y) {
            this._pivot = {x, y};
            this._applyPivot();
        }
        if (softCursor)
            this._placeSoftCursor();
        return GLib.SOURCE_CONTINUE;
    }
}
