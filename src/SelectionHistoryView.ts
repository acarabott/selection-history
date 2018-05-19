import { Obs, observable } from "./Obs";
import { SelectableView } from "./SelectableView";

type historyItem = Map<SelectableView, boolean>;

export class SelectionHistoryView {
  public  el: HTMLElement;

  @observable
  public currentSelection: SelectableView[];

  protected parentEl: HTMLElement;
  protected _historyItemHeight: number;
  protected currentSelectionObs!: Obs;
  protected hoveredHistoryItem?: historyItem;
  @observable
  protected history!: historyItem[];
  protected historyObs!: Obs;
  protected _isPreviewing!: boolean;
  protected isCombiningPreviews: boolean;

  constructor(parentEl: HTMLElement) {
    this.el = document.createElement("div");
    this.el.classList.add("selectionHistory");

    this.parentEl = parentEl;
    this._historyItemHeight = 50;
    this.currentSelection = [];
    this.history = [];
    this.isCombiningPreviews = false;

    document.addEventListener("keydown", event => {
      if (["ShiftLeft", "ShiftRight"].includes(event.code)) {
        this.isCombiningPreviews = true;
        this.updatePreview();
      }
    }, false);

    document.addEventListener("keyup", event => {
      if (["ShiftLeft", "ShiftRight"].includes(event.code) && !event.shiftKey) {
        this.isCombiningPreviews = false;
        this.updatePreview();
      }
    }, false);

    this.currentSelectionObs.subscribe((selectables: SelectableView[]) => {
      this.addToHistory(new Map(selectables.map(selectable => {
        return <[SelectableView, boolean]>[selectable, selectable.selected];
      })));
    });

    this.historyObs.subscribe(() => this.render());
  }

  get historyItemHeight() { return this._historyItemHeight; }
  set historyItemHeight(height: number) {
    this._historyItemHeight = height;
    Array.from(this.el.children).forEach(el => {
      (el as HTMLElement).style.height = `${height}px`;
    });
  }

  get isPreviewing() { return this._isPreviewing; }
  set isPreviewing(isPreviewing) {
    this._isPreviewing = isPreviewing;
    isPreviewing
      ? this.parentEl.classList.add("previewing")
      : this.parentEl.classList.remove("previewing");
  }

  addToHistory(item: historyItem) {
    const selectedStates = Array.from(item.values());
    if (!selectedStates.some(bool => bool)) { return; }

    const haveHistory = this.history.length > 0;
    if (haveHistory) {
      const hasChanged = Array.from(item.entries()).map(([sel, state]) => {
        return state !== this.history[0].get(sel);
      });
      if (!hasChanged) { return; }
    }

    this.history.unshift(item);
    this.historyObs.notify();
  }

  showPreview(item: historyItem) {
    item.forEach((selected, view) => view.preview = selected);
  }

  updatePreview() {
    const currentSelection = this.history[0];
    currentSelection.forEach((selected, view) => {
      const isHoverSelected = this.hoveredHistoryItem === undefined ||
                              this.hoveredHistoryItem.get(view)
      view.preview = isHoverSelected || (this.isCombiningPreviews && selected);
    });
  }

  hidePreview() {
    this.currentSelection.forEach(item => item.preview = false);
  }

  render() {
    Array.from(this.el.children).forEach(child => this.el.removeChild(child));
    this.history.forEach((historyItem, i) => {
      const button = document.createElement("div");
      button.classList.add("history-item");
      button.style.height = `${this.historyItemHeight}px`;

      const number = document.createElement("div");
      number.classList.add("history-number");
      number.textContent = `${this.history.length - i}`;
      button.appendChild(number);

      historyItem.forEach((selected, view) => {
        const clone = view.cloneEl();
        const isSelected = selected;

        isSelected ? clone.classList.add("selected")
                   : clone.classList.remove("selected");
        clone.classList.remove("hover");

        button.appendChild(clone);
      });

      button.addEventListener("click", () => {
        historyItem.forEach((selected, view) => view.selected = selected);
        this.parentEl.classList.remove("previewing");
      }, false);

      button.addEventListener("mouseenter", () => {
        this.hoveredHistoryItem = historyItem;
        this.updatePreview();
        this.isPreviewing = true;
      }, false);

      button.addEventListener("mouseleave", () => {
        this.hoveredHistoryItem = undefined;
        this.hidePreview();
        this.isPreviewing = false;
      }, false);

      this.el.appendChild(button);
    });
  }
}
