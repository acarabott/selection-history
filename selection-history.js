class Obs {
  static name(name) { return `${name}Obs`; }

  constructor(value) {
    this._value = value;
    this.subscriptions = [];
  }

  get value() { return this._value; }
  set value(value) {
    this._value = value;
    this.notify();
  }

  setValueWithoutNotify(value) { this._value = value; }

  subscribe(func) {
    this.subscriptions.push(func);
  }

  unsubscribe(func) {
    this.subscriptions = this.subscriptions.filter(_func => _func !== func);
  }

  notify() {
    this.subscriptions.forEach(subscription => subscription(this.value));
  }
}

function addObs(obj, name, value) {
  const propName = Obs.name(name);
  obj[propName] = new Obs(value);

  Object.defineProperty(obj, name, {
    get() { return obj[propName].value; },
    set(value) { obj[propName].value = value; }
  });
}

const selectables = [];
class Selectable {
  static get all() { return Array.from(selectables); }
  static add(selectable) { selectables.push(selectable); }

  constructor(parent, x, y, width, height) {
    this.el = document.createElement("div");
    this.el.classList.add("selectable");

    this.el.style.left = x;
    this.el.style.top = y;
    this.el.style.width = width;
    this.el.style.height = height;

    this.selectedObs = new Obs(false);
    this.hoverObs = new Obs(false);

    this.el.addEventListener("mouseenter", () => this.hover = true, false);
    this.el.addEventListener("mouseleave", () => this.hover = false, false);
    this.el.addEventListener("click", () => this.selected = !this.selected, false);

    parent.appendChild(this.el);

    Selectable.add(this);
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

  setSelectedWithoutNotify(value) {
    this.selectedObs.setValueWithoutNotify(value);
    this.updateSelectedClass();
  }
}

class SelectionHistory {
  constructor() {
    this.el = document.createElement("div");
    this.el.classList.add("selectionHistory");

    this.containerEl;
    this._historyItemHeight = 50;
    this.items = [];
    addObs(this, "history", []);

    this[Obs.name("history")].subscribe(() => this.render());
    this.addToHistory([]);

    this.hoveredHistoryItem = [];
    this.combining = false;
    document.addEventListener("keydown", event => {
      if (["ShiftLeft", "ShiftRight"].includes(event.code)) {
        this.combining = true;
        this.updatePreview();
      }
    }, false);

    document.addEventListener("keyup", event => {
      if (["ShiftLeft", "ShiftRight"].includes(event.code) && !event.shiftKey) {
        this.combining = false;
        this.updatePreview();
      }
    }, false);

  }

  get selection() { return this.items.filter(item => item.selected); }

  set historyItemHeight(height) {
    this._historyItemHeight = height;
    Array.from(this.el.children).forEach(el => el.style.height = `${height}px`);
  }

  addItem(item) {
    item[Obs.name("selected")].subscribe(() => this.updateHistory());
    this.items.push(item);
  }

  addToHistory(items) {
    const haveHistory = this.history.length > 0;
    if (haveHistory) {
      const hasChanged = !(items.every(item => this.history[0].includes(item) &&
                           this.history[0].every(item => items.includes(item))));
      if (!hasChanged) { return; }
    }

    this.history.unshift(items);
    this[Obs.name("history")].notify();
  }

  updateHistory() {
    if (this.selection.length === 0) { return; }

    this.addToHistory(this.selection);
  }

  calculateSelection(newSelection, combining=false) {
    return this.items.map(item => {
      const included = newSelection.includes(item);

      const wouldSelect = combining
        ? (included && !item.selected) || (!included && item.selected)
        : included;

      return { item, wouldSelect };
    });
  }

  makeSelection(newSelection, combining = this.combining) {
    this.calculateSelection(newSelection, combining).forEach(({item, wouldSelect}) => {
      item.setSelectedWithoutNotify(wouldSelect);
    });
  }

  showPreview(calculatedSelection) {
    this.containerEl.classList.add("previewing");
    calculatedSelection.forEach(({item, wouldSelect}) => item.preview = wouldSelect);
  }

  hidePreview() {
    this.containerEl.classList.remove("previewing");
    this.items.forEach(item => item.preview = false);
  }

  updatePreview() {
    this.showPreview(this.calculateSelection(this.hoveredHistoryItem, this.combining));
  }

  render() {
    Array.from(this.el.children).forEach(child => this.el.removeChild(child));
    this.history.forEach((historyItem, i) => {
      const button = document.createElement("div");
      button.classList.add("history-item");


      const number = document.createElement("div");
      number.classList.add("history-number");
      number.textContent = `${this.history.length - i}`;
      button.appendChild(number);

      this.items.forEach(selectable => {
        const clone = selectable.el.cloneNode();
        const isSelected = historyItem.includes(selectable);

        isSelected ? clone.classList.add("selected")
                   : clone.classList.remove("selected");
        clone.classList.remove("hover");

        button.appendChild(clone);
      });

      button.addEventListener("click", event => {
        const combining = event.shiftKey;
        this.makeSelection(historyItem, combining);
        if (combining) { this.updateHistory(); }
        this.hidePreview();
      }, false);

      button.addEventListener("mouseenter", () => {
        this.hoveredHistoryItem = historyItem;
        this.updatePreview();
      }, false);

      button.addEventListener("mouseleave", () => {
        this.hoveredHistoryItem = [];
        this.hidePreview();
      }, false);

      this.el.appendChild(button);
    });

    this.historyItemHeight = this._historyItemHeight;
  }
}

class DragSelection {
  constructor(parent) {
    this.parent = parent;
    this.el = document.createElement("div");
    this.el.classList.add("drag-selection");

    this._tl;
    this._br;
    this._active;
    this._clickPoint;

    addObs(this, "toSelect", []);

    this.tl = { x: 0, y: 0 };
    this.br = { x: 100, y: 100 };
    this.active = false;

    parent.appendChild(this.el);

    this.onPointerDown = this.onPointerDown.bind(this);
    this.parent.addEventListener("mousedown", this.onPointerDown, false);
    this.parent.addEventListener("touchstart", this.onPointerDown, false);

    this.onPointerMove = this.onPointerMove.bind(this);
    this.onPointerUp = this.onPointerUp.bind(this);
  }

  get active() { return this._active; }
  set active(active) {
    this._active = active;
    active ? this.el.classList.add("active")
           : this.el.classList.remove("active");
  }

  get tl() { return this._tl; }
  set tl(tl) {
    this._tl = tl;
    this.el.style.left = `${tl.x}px`;
    this.el.style.top = `${tl.y}px`;
  }

  get br() { return this._br; }
  set br(br) {
    this._br = br;
    this.el.style.width = `${br.x - this.tl.x}px`;
    this.el.style.height = `${br.y - this.tl.y}px`;
  }

  getPointFromEvent(event) {
    return { x: event.clientX, y: event.clientY } ;
  }

  getRelativePointFromEvent(event) {
    const absPoint = this.getPointFromEvent(event);
    const parentRect = this.parent.getBoundingClientRect();
    const x = absPoint.x - parentRect.x;
    const y = absPoint.y - parentRect.y;

    return { x, y };
  }

  onPointerDown(event) {
    this.active = true;
    const relativePoint = this.getRelativePointFromEvent(event);
    this.tl = relativePoint;
    this.br = relativePoint;
    this._clickPoint = relativePoint;

    const point = this.getPointFromEvent(event);
    if (!Selectable.all.some(sel => {
      const clientRect = sel.el.getBoundingClientRect();
      const clicked = point.x >= clientRect.x &&
                      point.y >= clientRect.y &&
                      point.x <= clientRect.x + clientRect.width &&
                      point.y <= clientRect.y + clientRect.height;

      return clicked;
    })) {
      this.toSelect = [];
    }

    document.addEventListener("mousemove", this.onPointerMove, false);
    document.addEventListener("touchmove", this.onPointerMove, false);
    document.addEventListener("mouseup", this.onPointerUp, false);
    document.addEventListener("touchend", this.onPointerUp, false);
  }

  overlapsRect(rect) {
    return this.br.x > rect.x &&
           this.tl.x < rect.x + rect.width &&
           this.br.y > rect.y &&
           this.tl.y < rect.y + rect.height;
  }

  onPointerMove(event) {
    const point = this.getRelativePointFromEvent(event);

    this.tl = {
      x: Math.min(point.x, this._clickPoint.x),
      y: Math.min(point.y, this._clickPoint.y)
    };

    this.br = {
      x: Math.max(point.x, this._clickPoint.x),
      y: Math.max(point.y, this._clickPoint.y)
    };

    const parentRect = this.parent.getBoundingClientRect();

    const toSelect = Selectable.all.filter(selectable => {
      const selectClientRect = selectable.el.getBoundingClientRect();

      const relativeRect = {
        x:      selectClientRect.x - parentRect.x,
        y:      selectClientRect.y - parentRect.y,
        width : selectClientRect.width,
        height: selectClientRect.height
      };

      return this.overlapsRect(relativeRect);
    });

    Selectable.all.forEach(sel => sel.hover = toSelect.includes(sel));

    this[Obs.name("toSelect")].setValueWithoutNotify(toSelect);
  }

  onPointerUp(event) {
    this.active = false;
    if (this.toSelect.length > 0) {
      this.toSelect.forEach(sel => sel.setSelectedWithoutNotify(true));
      this[Obs.name("toSelect")].notify();
      this[Obs.name("toSelect")].setValueWithoutNotify([]);
    }

    const point = this.getPointFromEvent(event);
    Selectable.all.forEach(sel => {
      const clientRect = sel.el.getBoundingClientRect();
      sel.hover = point.x >= clientRect.x &&
                  point.y >= clientRect.y &&
                  point.x <= clientRect.x + clientRect.width &&
                  point.y <= clientRect.y + clientRect.height;
    });

    document.removeEventListener("mousemove", this.onPointerMove, false);
    document.removeEventListener("touchmove", this.onPointerMove, false);
    document.removeEventListener("mouseup", this.onPointerUp, false);
    document.removeEventListener("touchend", this.onPointerUp, false);
  }
}

function randomInt(min, max) {
  return Math.floor(min + (Math.random() * (max - min)));
}

const container = document.createElement("div");
container.classList.add("container");
document.body.appendChild(container);

const items = Array.from(Array(5)).map(() => {
  const x = `${randomInt(20, 80)}%`;
  const y = `${randomInt(20, 80)}%`;
  const length = `${randomInt(10, 20)}%`;
  const selectable = new Selectable(container, x, y, length, length);

  return selectable;
});

const selectionHistory = new SelectionHistory;
selectionHistory.containerEl = container;

items.forEach(item => {
  selectionHistory.addItem(item);
});

document.body.appendChild(selectionHistory.el);

const onResize = () => {
  const containerRect = container.getBoundingClientRect();
  const heightToWidthRatio = containerRect.height / containerRect.width;

  const historyRect = selectionHistory.el.getBoundingClientRect();
  selectionHistory.historyItemHeight = historyRect.width * heightToWidthRatio;
};

window.addEventListener("resize", onResize, false);
onResize();


const dragSelection = new DragSelection(container);
dragSelection[Obs.name("toSelect")].subscribe(toSelect => {
  selectionHistory.makeSelection(toSelect);
  selectionHistory.updateHistory();
});

// TODO touch support
