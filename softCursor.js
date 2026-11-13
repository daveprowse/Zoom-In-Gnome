// SPDX-License-Identifier: GPL-3.0-or-later

import Clutter from 'gi://Clutter';
import Meta from 'gi://Meta';
import St from 'gi://St';

const WIDTH = 24;
const HEIGHT = 32;

function getTracker() {
    try {
        if (global.backend && typeof global.backend.get_cursor_tracker === 'function')
            return global.backend.get_cursor_tracker();
    } catch (e) {
        console.warn(`[Z.I.G.] backend cursor tracker unavailable: ${e}`);
    }
    try {
        return Meta.CursorTracker.get_for_display(global.display);
    } catch (e) {
        console.warn(`[Z.I.G.] cursor tracker unavailable: ${e}`);
    }
    return null;
}

function getSeat() {
    try {
        const backend = global.stage?.context?.get_backend?.();
        if (backend)
            return backend.get_default_seat();
    } catch (e) {
        console.warn(`[Z.I.G.] stage context seat unavailable: ${e}`);
    }
    try {
        return Clutter.get_default_backend().get_default_seat();
    } catch (e) {
        console.warn(`[Z.I.G.] default seat unavailable: ${e}`);
    }
    return null;
}

export class SoftCursor {
    constructor() {
        this._tracker = getTracker();
        this._seat = getSeat();
        this._realHidden = false;
        this._seatInhibited = false;
        this._visibilityId = 0;        

        this.actor = new St.DrawingArea({
            name: 'zig-cursor',
            reactive: false,
            width: WIDTH,
            height: HEIGHT,
            visible: false,
        });
        this.actor.connect('repaint', area => this._paint(area));
    }

    /** Show the drawn cursor with its tip at (x, y), in the parent actor's coordinates. */
    place(x, y) {
        this._hideReal();
        if (!this._realHidden) {
            this.actor.hide();
            return;
        }
        this.actor.set_position(Math.round(x - 1), Math.round(y - 1));
        if (!this.actor.visible)
            this.actor.show();
    }

    /** Hide the drawn cursor and give the real one back. Safe to call repeatedly. */
    hide() {
        this.actor.hide();
        this._showReal();
    }

    release() {
        this._showReal();
    }

    _hideReal() {
        const t = this._tracker;
        if (this._realHidden || !t)
            return;

        // Hiding the cursor makes Mutter give up the Wayland pointer focus, which stops clicks
        // reaching windows. The hold is counted and the cursor tracker may already own one, so
        // always add our own and keep it until the real cursor is back.
        const seat = this._seat;
        let seatState = 'no seat';
        try {
            if (seat) {
                if (typeof seat.inhibit_unfocus !== 'function') {
                    seatState = 'no inhibit_unfocus method';
                } else {
                    const already = seat.is_unfocus_inhibited();
                    seat.inhibit_unfocus();
                    this._seatInhibited = true;
                    seatState = already ? 'taken (on top of an existing hold)' : 'taken';
                }
            }
        } catch (e) {
            seatState = `error: ${e}`;
            console.warn(`[Z.I.G.] could not keep pointer focus: ${e}`);
        }

        try {
            if (typeof t.inhibit_cursor_visibility === 'function') {
                t.inhibit_cursor_visibility();
            } else {
                t.set_pointer_visible(false);
                // Older versions can show the cursor again on their own; hide it right away.
                this._visibilityId = t.connect('visibility-changed', () => {
                    if (this._realHidden && t.get_pointer_visible())
                        t.set_pointer_visible(false);
                });
            }
            this._realHidden = true;
        } catch (e) {
            console.warn(`[Z.I.G.] could not hide the system cursor: ${e}`);
            this._restoreSeat();
        }        
    }

    _showReal() {
        const t = this._tracker;
        if (!this._realHidden || !t)
            return;

        try {
            if (this._visibilityId) {
                t.disconnect(this._visibilityId);
                this._visibilityId = 0;
            }
            if (typeof t.uninhibit_cursor_visibility === 'function')
                t.uninhibit_cursor_visibility();
            else
                t.set_pointer_visible(true);
        } catch (e) {
            console.warn(`[Z.I.G.] could not restore the system cursor: ${e}`);
        }
        this._realHidden = false;
        this._restoreSeat();
    }

    _restoreSeat() {
        if (!this._seatInhibited)
            return;
        try {
            this._seat.uninhibit_unfocus();
        } catch (e) {
            console.warn(`[Z.I.G.] could not release pointer focus hold: ${e}`);
        }
        this._seatInhibited = false;
    }

    _paint(area) {
        const cr = area.get_context();
        cr.moveTo(1, 1);
        cr.lineTo(1, 23);
        cr.lineTo(6.5, 18);
        cr.lineTo(10.5, 27.5);
        cr.lineTo(14.5, 25.8);
        cr.lineTo(10.5, 16.5);
        cr.lineTo(17.5, 16.5);
        cr.closePath();
        cr.setSourceRGBA(1, 1, 1, 1);
        cr.fillPreserve();
        cr.setSourceRGBA(0, 0, 0, 1);
        cr.setLineWidth(1.5);
        cr.stroke();
        cr.$dispose();
    }
}
