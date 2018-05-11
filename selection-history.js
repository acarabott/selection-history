class Obs {
  static getObsName(name) { return `${name}Obs`; }

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
  const propName = Obs.getObsName(name);
  obj[propName] = new Obs(value);

  Object.defineProperty(obj, name, {
    get() { return obj[propName].value; },
    set(value) { obj[propName].value = value; }
  });
}

class Selectable {
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

    this[Obs.getObsName("history")].subscribe(() => this.render());
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
    item[Obs.getObsName("selected")].subscribe(() => this.updateHistory());
    this.items.push(item);
  }

  addToHistory(items) {
    this.history.unshift(items);
    this[Obs.getObsName("history")].notify();
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

  makeSelection(newSelection, combining = false) {
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
