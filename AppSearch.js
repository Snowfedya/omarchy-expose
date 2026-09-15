.pragma library

function normalize(str) {
    return String(str || "").trim().toLowerCase();
}

function normalizeId(id) {
    var str = normalize(id);
    return str.slice(-8) === ".desktop" ? str.slice(0, -8) : str;
}

function search(query, desktopEntries, maxResults) {
    if (!query) return [];
    var needle = normalize(query);
    if (needle.length === 0) return [];

    var limit = maxResults || 6;
    var results = [];
    var seen = {};

    // 1. Terminal command runner mode with '>'
    if (needle.charAt(0) === ">") {
        var cmd = query.slice(1).trim();
        if (cmd.length > 0) {
            results.push({
                type: "command",
                title: cmd,
                subtext: "Run in terminal",
                command: cmd,
                icon: "utilities-terminal"
            });
            return results;
        }
    }

    // 2. Quick Omarchy system actions
    var actions = [
        { key: "power", title: "Power", subtext: "Lock, suspend, shutdown", route: "system.power", icon: "system-shutdown" },
        { key: "shutdown", title: "Shutdown", subtext: "Power off", route: "system.power", icon: "system-shutdown" },
        { key: "reboot", title: "Restart", subtext: "Reboot", route: "system.power", icon: "system-reboot" },
        { key: "theme", title: "Theme", subtext: "Switch active theme", route: "style.theme", icon: "preferences-desktop-theme" },
        { key: "wallpaper", title: "Wallpaper", subtext: "Change background", route: "style.background", icon: "preferences-desktop-wallpaper" },
        { key: "background", title: "Wallpaper", subtext: "Change background", route: "style.background", icon: "preferences-desktop-wallpaper" },
        { key: "settings", title: "Settings", subtext: "Omarchy setup", route: "setup", icon: "preferences-system" },
        { key: "clipboard", title: "Clipboard", subtext: "Clipboard manager", route: "tools.clipboard", icon: "edit-paste" }
    ];

    for (var a = 0; a < actions.length; a++) {
        var action = actions[a];
        if (action.key.indexOf(needle) !== -1 || action.title.toLowerCase().indexOf(needle) !== -1) {
            results.push({
                type: "action",
                title: action.title,
                subtext: action.subtext,
                route: action.route,
                icon: action.icon
            });
            if (results.length >= limit) return results;
        }
    }

    // 3. Desktop applications search
    var entries = desktopEntries || [];
    var scored = [];

    for (var i = 0; i < entries.length; i++) {
        var entry = entries[i];
        if (!entry || entry.noDisplay) continue;

        var name = String(entry.name || "").trim();
        var genericName = String(entry.genericName || "").trim();
        var id = normalizeId(entry.id);
        var comment = String(entry.comment || "").trim();

        var haystack = [name, genericName, id, comment].join(" ").toLowerCase();
        var pos = haystack.indexOf(needle);
        if (pos === -1) continue;

        var dedupKey = name.toLowerCase() + "|" + (entry.icon || "");
        if (seen[dedupKey]) continue;
        seen[dedupKey] = true;

        var namePos = name.toLowerCase().indexOf(needle);
        var score = (namePos === 0) ? 0 : (namePos > 0 ? 1 : 2 + pos);

        scored.push({
            type: "app",
            title: name,
            subtext: genericName || comment,
            appId: id,
            icon: entry.icon || "application-x-executable",
            score: score
        });
    }

    scored.sort(function(x, y) {
        return (x.score - y.score) || x.title.localeCompare(y.title);
    });

    for (var j = 0; j < scored.length && results.length < limit; j++) {
        results.push(scored[j]);
    }

    return results;
}

function launch(item, quickshell) {
    if (!item || !quickshell) return;
    if (item.type === "command") {
        quickshell.execDetached(["xdg-terminal-exec", "--hold", "--", "bash", "-c", item.command]);
    } else if (item.type === "action") {
        quickshell.execDetached(["omarchy-menu", "summon", item.route]);
    } else if (item.type === "app") {
        quickshell.execDetached(["uwsm-app", "--", "gtk-launch", item.appId + ".desktop"]);
    }
}
