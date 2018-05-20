import { Obs } from "./Obs";

interface IRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const selectables = new Map();

export class SelectableView {
  static get all() : SelectableView[] { return Array.from(selectables.values()); }
  static add(selectable: SelectableView) { selectables.set(selectable.el, selectable); }
  static getFromEl(el: HTMLElement) : SelectableView | undefined { return selectables.get(el); }

  protected el: HTMLElement;
  protected selectedObs: Obs;
  protected hoverObs: Obs;

  constructor(parent: HTMLElement, x: string, y: string, width: string, height: string) {
    this.el = document.createElement("div");
    this.el.classList.add("selectable");

    this.el.style.left = x.toString();
    this.el.style.top = y.toString();
    this.el.style.width = width.toString();
    this.el.style.height = height.toString();

    this.selectedObs = new Obs(false);
    this.hoverObs = new Obs(false);

    parent.appendChild(this.el);

    SelectableView.add(this);
  }

  updateSelectedClass() {
    this.selected ? this.el.classList.add("selected")
                  : this.el.classList.remove("selected");
  }

  get selected() { return this.selectedObs.value; }
  set selected(selected) {
    this.selectedObs.value = selected;
    this.updateSelectedClass();
  }

  get hover() { return this.hoverObs.value; }
  set hover(hover) {
    this.hoverObs.value = hover;
    hover ? this.el.classList.add("hover")
          : this.el.classList.remove("hover");

  }

  get preview() { return this.el.classList.contains("preview"); }
  set preview(preview) {
    preview ? this.el.classList.add("preview")
            : this.el.classList.remove("preview");
  }

  get rect() : IRect {
    const clientRect = this.el.getBoundingClientRect();
    return {
      x: clientRect.left,
      y: clientRect.top,
      width: clientRect.width,
      height: clientRect.height
    };
  }

  setSelectedWithoutNotify(value: any) {
    this.selectedObs.setValueWithoutNotify(value);
    this.updateSelectedClass();
  }

  cloneEl() { return this.el.cloneNode() as HTMLElement; }
}
