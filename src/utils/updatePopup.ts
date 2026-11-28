/*
 * Shutcord, a modification for Discord's desktop app
 * Copyright (c) 2026 Shutcord and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

export interface UpdatePopupOptions {
    title: string;
    lines?: string[];
    /** Label of the main button */
    action: string;
    /** Runs when the main button is clicked. The popup shows the returned error if it throws */
    onAction: () => Promise<void> | void;
}

const ID = "shutcord-update-popup";

/** A card in the bottom right corner with a main button and a Later button. Only one is shown at a time */
export function showUpdatePopup({ title, lines = [], action, onAction }: UpdatePopupOptions) {
    document.getElementById(ID)?.remove();

    const card = document.createElement("div");
    card.id = ID;
    Object.assign(card.style, {
        position: "fixed",
        right: "20px",
        bottom: "20px",
        width: "320px",
        zIndex: "100000",
        padding: "16px",
        borderRadius: "14px",
        background: "#161618",
        color: "#e4e4e7",
        border: "1px solid rgba(255, 255, 255, .12)",
        boxShadow: "0 12px 40px rgba(0, 0, 0, .55)",
        font: "13px system-ui, 'Segoe UI', sans-serif",
        transform: "translateY(12px)",
        opacity: "0",
        transition: "transform .25s ease, opacity .25s ease"
    });

    const head = document.createElement("div");
    head.textContent = title;
    Object.assign(head.style, { fontWeight: "700", fontSize: "14px", marginBottom: lines.length ? "8px" : "12px" });
    card.append(head);

    if (lines.length) {
        const list = document.createElement("div");
        Object.assign(list.style, { color: "#a1a1aa", marginBottom: "12px", lineHeight: "1.45" });
        for (const l of lines.slice(0, 3)) {
            const row = document.createElement("div");
            row.textContent = "• " + l;
            Object.assign(row.style, { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" });
            list.append(row);
        }
        if (lines.length > 3) {
            const more = document.createElement("div");
            more.textContent = `and ${lines.length - 3} more`;
            list.append(more);
        }
        card.append(list);
    }

    const error = document.createElement("div");
    Object.assign(error.style, { color: "#f87171", marginBottom: "10px", display: "none" });
    card.append(error);

    const row = document.createElement("div");
    Object.assign(row.style, { display: "flex", gap: "8px", justifyContent: "flex-end" });

    const mkButton = (label: string, primary: boolean) => {
        const b = document.createElement("button");
        b.textContent = label;
        Object.assign(b.style, {
            font: "inherit",
            fontWeight: "600",
            padding: "7px 14px",
            borderRadius: "8px",
            cursor: "pointer",
            border: primary ? "0" : "1px solid rgba(255, 255, 255, .12)",
            background: primary ? "#e4e4e7" : "transparent",
            color: primary ? "#18181b" : "#e4e4e7"
        });
        return b;
    };

    const close = () => {
        card.style.opacity = "0";
        card.style.transform = "translateY(12px)";
        setTimeout(() => card.remove(), 260);
    };

    const later = mkButton("Later", false);
    later.onclick = close;

    const main = mkButton(action, true);
    main.onclick = async () => {
        main.disabled = true;
        main.textContent = "Working...";
        error.style.display = "none";
        try {
            await onAction();
            close();
        } catch (e) {
            error.textContent = e instanceof Error ? e.message : "Something went wrong";
            error.style.display = "block";
            main.disabled = false;
            main.textContent = "Try again";
        }
    };

    row.append(later, main);
    card.append(row);
    document.body.append(card);
    requestAnimationFrame(() => {
        card.style.opacity = "1";
        card.style.transform = "none";
    });
}
