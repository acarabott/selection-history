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

  static invalidateRectCache() {
    SelectableView.all.forEach(view => view.cacheValid = false);
  }

  protected el: HTMLElement;
  protected _selected: boolean;
  protected cacheValid: boolean;
  protected cachedRect: IRect;

  constructor(parent: HTMLElement, x: string, y: string, width: string, height: string) {
    this.el = document.createElement("div");
    this.el.classList.add("selectable");

    this.el.style.left = x.toString();
    this.el.style.top = y.toString();
    this.el.style.width = width.toString();
    this.el.style.height = height.toString();

    this._selected = false;
    this.cacheValid = false;
    this.cachedRect = { x: 0, y: 0, width: 0, height: 0 };

    parent.appendChild(this.el);

    SelectableView.add(this);
  }

  updateSelectedClass() {
    this.selected ? this.el.classList.add("selected")
                  : this.el.classList.remove("selected");
  }

  public get selected() { return this._selected; }
  public set selected(selected) {
    this._selected = selected;
    this.updateSelectedClass();
  }

  get preview() { return this.el.classList.contains("preview"); }
  set preview(preview) {
    preview ? this.el.classList.add("preview")
            : this.el.classList.remove("preview");
  }

  get rect() : IRect {
    if (!this.cacheValid) {
      const clientRect = this.el.getBoundingClientRect();
      this.cachedRect = {
        x:      clientRect.left,
        y:      clientRect.top,
        width:  clientRect.width,
        height: clientRect.height
      };
      this.cacheValid = true;
    }
    return this.cachedRect;
  }

  cloneEl() { return this.el.cloneNode() as HTMLElement; }
}

window.addEventListener("resize", () => {
  SelectableView.invalidateRectCache();
}, false);

window.addEventListener("scroll", () => {
  SelectableView.invalidateRectCache();
}, false);
