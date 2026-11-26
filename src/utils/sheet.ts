import { managedStyleRootNode } from "@api/Styles";

import { createAndAppendStyle } from "./css";

/** A small managed <style> element that a plugin can fill and remove again */
export function createSheet(id: string) {
    let el: HTMLStyleElement | undefined;

    return {
        set(css: string) {
            el ??= createAndAppendStyle(id, managedStyleRootNode);
            el.textContent = css;
        },
        clear() {
            el?.remove();
            el = undefined;
        }
    };
}

export type Corner = "top-left" | "top-right" | "bottom-left" | "bottom-right";

/** A small floating label that sits in one corner of the window */
export function createPill(id: string, corner: Corner) {
    const el = document.createElement("div");
    el.id = id;
    Object.assign(el.style, {
        position: "fixed",
        zIndex: "9990",
        padding: "5px 10px",
        borderRadius: "999px",
        font: "600 12px system-ui, sans-serif",
        background: "rgba(24, 24, 27, .85)",
        color: "#e4e4e7",
        border: "1px solid rgba(255, 255, 255, .1)",
        backdropFilter: "blur(8px)",
        pointerEvents: "none",
        userSelect: "none"
    });
    placePill(el, corner);
    document.body.append(el);
    return el;
}

export function placePill(el: HTMLElement, corner: Corner) {
    const [v, h] = corner.split("-");
    el.style.top = el.style.bottom = el.style.left = el.style.right = "auto";
    el.style[v as "top" | "bottom"] = "12px";
    el.style[h as "left" | "right"] = "12px";
}
