// SPDX-License-Identifier: GPL-3.0-or-later
import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';
import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export default class ZoomInGnomePrefs extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();
        window._settings = settings;

        const page = new Adw.PreferencesPage({
            title: 'Zoom In Gnome',
            icon_name: 'zoom-in-symbolic',
        });
        window.add(page);

        const zoom = new Adw.PreferencesGroup({title: 'Zoom'});
        page.add(zoom);

        zoom.add(this._spinRow(settings, 'zoom-level', {
            title: 'Zoom level',
            subtitle: 'Magnification factor',
            lower: 1.25, upper: 8, step: 0.25, digits: 2,
        }));
        zoom.add(this._spinRow(settings, 'zoom-duration-ms', {
            title: 'Animation duration',
            subtitle: 'Milliseconds (0 = instant)',
            lower: 0, upper: 1000, step: 50, digits: 0,
        }));

        const follow = new Adw.PreferencesGroup({title: 'Following'});
        page.add(follow);

        const followDefault = new Adw.SwitchRow({
            title: 'Follow the cursor when zooming in',
            subtitle: 'Toggle it while zoomed with the follow hotkey',
        });
        settings.bind('follow-default-on', followDefault, 'active', Gio.SettingsBindFlags.DEFAULT);
        follow.add(followDefault);

        const softCursor = new Adw.SwitchRow({
            title: 'Software cursor while the view is fixed',
            subtitle: 'Keeps clicks and highlighting lined up; turn off if the pointer misbehaves',
        });
        settings.bind('software-cursor', softCursor, 'active', Gio.SettingsBindFlags.DEFAULT);
        follow.add(softCursor);

        const followCursorValues = ['auto', 'on', 'off'];
        const followCursor = new Adw.ComboRow({
            title: 'Drawn cursor while following',
            subtitle: 'Auto draws our own cursor on GNOME 49 and older, where the system cursor can vanish',
            model: new Gtk.StringList({strings: ['Auto', 'Always', 'Never']}),
        });
        followCursor.selected = Math.max(0, followCursorValues.indexOf(settings.get_string('follow-cursor')));
        followCursor.connect('notify::selected', () =>
            settings.set_string('follow-cursor', followCursorValues[followCursor.selected]));
        follow.add(followCursor);

        follow.add(this._spinRow(settings, 'follow-smoothing', {
            title: 'Follow smoothing',
            subtitle: '1.0 keeps clicks exactly under the cursor; lower glides more but lags',
            lower: 0.05, upper: 1, step: 0.05, digits: 2,
        }));

        const keys = new Adw.PreferencesGroup({
            title: 'Shortcuts',
            description: 'Accelerator syntax, e.g. <Super>z or <Control><Alt>m. Press Enter to apply.',
        });
        page.add(keys);
        keys.add(this._hotkeyRow(settings, 'hotkey-zoom', 'Toggle zoom'));
        keys.add(this._hotkeyRow(settings, 'hotkey-follow', 'Toggle follow'));
    }

    _spinRow(settings, key, {title, subtitle, lower, upper, step, digits}) {
        const row = new Adw.SpinRow({
            title,
            subtitle,
            digits,
            adjustment: new Gtk.Adjustment({
                lower,
                upper,
                step_increment: step,
                page_increment: step * 4,
            }),
        });
        settings.bind(key, row, 'value', Gio.SettingsBindFlags.DEFAULT);
        return row;
    }

    _hotkeyRow(settings, key, title) {
        const row = new Adw.EntryRow({title, show_apply_button: true});
        row.set_text(settings.get_strv(key)[0] ?? '');
        row.connect('apply', () => {
            const text = row.get_text().trim();
            if (text === '') {
                row.remove_css_class('error');
                settings.set_strv(key, []);
                return;
            }
            const [ok] = Gtk.accelerator_parse(text);
            if (!ok) {
                row.add_css_class('error');
                return;
            }
            row.remove_css_class('error');
            settings.set_strv(key, [text]);
        });
        return row;
    }
}
