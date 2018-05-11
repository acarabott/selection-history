const container = document.createElement("div");
container.style.width = "100%";
container.style.height = "100%";
document.body.appendChild(container);

function randomInt(min, max) {
  return Math.floor(min + (Math.random() * (max - min)));
}

function addCSSClassProperty(obj, el, className) {
  Object.defineProperty(obj, className, {
    get: () => el.classList.contains(className),
    set: bool => {
      bool ? el.classList.add(className)
           : el.classList.remove(className);
    }
  });
}

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

  setSelectedWithoutNotify(value) {
    this.selectedObs.setValueWithoutNotify(value);
    this.updateSelectedClass();
  }
}

class SelectionHistory {
  constructor() {
    this.items = [];
    addObs(this, "history", []);

    this.el = document.createElement("div");

    this[Obs.getObsName("history")].subscribe(() => this.render());
  }

  get selected() { return this.items.filter(item => item.selected); }

  addItem(item) {
    item[Obs.getObsName("selected")].subscribe(() => this.updateHistory());
    this.items.push(item);
  }

  updateHistory() {
    this.history.push(this.selected);
    this[Obs.getObsName("history")].notify();
  }

  makeSelection(newSelection) {
    this.items.forEach(item => item.setSelectedWithoutNotify(newSelection.includes(item)));
  }

  render() {
    Array.from(this.el.children).forEach(child => this.el.removeChild(child));
    this.history.forEach((historyItem, i) => {
      const button = document.createElement("button");
      button.textContent = `${i} - ${historyItem.length}`;
      button.addEventListener("click", () => this.makeSelection(historyItem), false);
      this.el.appendChild(button);
    });
  }
}

const items = Array.from(Array(5)).map(() => {
  const x = `${randomInt(20, 80)}%`;
  const y = `${randomInt(20, 80)}%`;
  const length = `${randomInt(50, 100)}px`;
  const selectable = new Selectable(container, x, y, length, length);

  return selectable;
});

const selectionHistory = new SelectionHistory;

items.forEach(item => {
  selectionHistory.addItem(item);
});

container.appendChild(selectionHistory.el);
