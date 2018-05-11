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
    this.items = [];
    addObs(this, "history", []);

    this[Obs.getObsName("history")].subscribe(() => this.render());
    this.addToHistory([]);
  }

  get selection() { return this.items.filter(item => item.selected); }

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

  makeSelection(newSelection) {
    this.items.forEach(item => item.setSelectedWithoutNotify(newSelection.includes(item)));
  }

  showPreview(previewItems) {
    this.containerEl.classList.add("previewing");
    this.items.forEach(item => item.preview = previewItems.includes(item));
  }

  hidePreview() {
    this.containerEl.classList.remove("previewing");
    this.items.forEach(item => item.preview = false);
  }

  render() {
    Array.from(this.el.children).forEach(child => this.el.removeChild(child));
    this.history.forEach((historyItem, i) => {
      const button = document.createElement("div");
      button.classList.add("history-item");
      // const button = document.createElement("button");
      button.textContent = `${this.history.length - i} - ${historyItem.length}`;
      button.addEventListener("click", event => {
        const combining = event.shiftKey;
        const items = combining
          ? [...this.selection, ...historyItem]
          : historyItem;

        this.makeSelection(items);
        if (combining) { this.updateHistory(); }
      }, false);
      button.addEventListener("mouseenter", () => this.showPreview(historyItem), false);
      button.addEventListener("mouseleave", () => this.hidePreview(), false);

      this.el.appendChild(button);
    });
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
  const length = `${randomInt(50, 100)}px`;
  const selectable = new Selectable(container, x, y, length, length);

  return selectable;
});

const selectionHistory = new SelectionHistory;
selectionHistory.containerEl = container;

items.forEach(item => {
  selectionHistory.addItem(item);
});

document.body.appendChild(selectionHistory.el);

// TODO de-select history item
