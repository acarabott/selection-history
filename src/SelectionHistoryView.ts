import { Obs, observable } from "./Obs";
import { SelectableView } from "./SelectableView";

type HistoryItem = Map<SelectableView, boolean>;
type HistoryPair = [SelectableView, boolean];

export class SelectionHistoryView {
  public  el: HTMLElement;

  @observable
  public currentSelection: SelectableView[];

  protected parentEl: HTMLElement;
  protected _historyItemHeight: number;
  protected currentSelectionObs!: Obs;
  protected hoveredHistoryItem?: HistoryItem;
  @observable
  protected history!: HistoryItem[];
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

    this.currentSelectionObs.subscribe((selectables: SelectableView[]) => {
      this.addToHistory(new Map(selectables.map(selectable => {
        return <HistoryPair>[selectable, selectable.selected];
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

  addToHistory(item: HistoryItem) {
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

  showPreview(item: HistoryItem) {
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
      const view = document.createElement("div");
      view.classList.add("history-item");
      view.style.height = `${this.historyItemHeight}px`;
      this.el.appendChild(view);


      const number = document.createElement("div");
      number.classList.add("history-number");
      number.textContent = `${this.history.length - i}`;
      view.appendChild(number);


      const preview = document.createElement("div");
      view.appendChild(preview);
      preview.classList.add("preview");

      historyItem.forEach((selected, view) => {
        const clone = view.cloneEl();
        const isSelected = selected;

        isSelected ? clone.classList.add("selected")
                   : clone.classList.remove("selected");
        clone.classList.remove("hover");

        preview.appendChild(clone);
      });


      const buttons = document.createElement("div");
      buttons.classList.add("buttons");
      view.appendChild(buttons);

      // Solo
      // -----------------------------------------------------------------------
      const soloButton = document.createElement("div");
      soloButton.classList.add("button");
      soloButton.classList.add("solo");
      soloButton.textContent = "S";
      buttons.appendChild(soloButton);

      soloButton.addEventListener("click", () => {
        historyItem.forEach((selected, view) => view.selected = selected);
        this.parentEl.classList.remove("previewing");
      }, false);

      soloButton.addEventListener("mouseenter", () => {
        this.showPreview(historyItem);
        this.isPreviewing = true;
      }, false);

      soloButton.addEventListener("mouseleave", () => {
        this.hidePreview();
        this.isPreviewing = false;
      }, false);

      // Add
      // -----------------------------------------------------------------------

      const addButton = document.createElement("div");
      addButton.classList.add("button");
      addButton.classList.add("add");
      addButton.textContent = "+";
      buttons.appendChild(addButton);

      const getAddSelection = (): HistoryItem => {
        const currentStateEntries = Array.from(this.history[0].entries());
        const combinedState: HistoryItem = new Map(currentStateEntries.map(([view, selected]) => {
          return <HistoryPair>[view, selected || historyItem.get(view)];
        }));

        return combinedState;
      };

      addButton.addEventListener("click", () => {
        const addSelection = getAddSelection();
        addSelection.forEach((selected, view) => view.selected = selected);
        this.parentEl.classList.remove("previewing");
      }, false);

      addButton.addEventListener("mouseenter", () => {
        this.showPreview(getAddSelection());
        this.isPreviewing = true;
      }, false);

      addButton.addEventListener("mouseleave", () => {
        this.hidePreview();
        this.isPreviewing = false;
      }, false);


      // Subtract
      // -----------------------------------------------------------------------
      const subtractButton = document.createElement("div");
      subtractButton.classList.add("button");
      subtractButton.classList.add("subtract");
      subtractButton.textContent = "-";
      buttons.appendChild(subtractButton);

      const getSubSelection = (): HistoryItem => {
        const currentStateEntries = Array.from(this.history[0].entries());
        const subtractedState: HistoryItem = new Map(currentStateEntries.map(([view, selected]) => {
          return <HistoryPair>[view, selected && !historyItem.get(view)];
        }));
        return subtractedState;
      };

      subtractButton.addEventListener("click", () => {
        const subSelection = getSubSelection();
        subSelection.forEach((selected, view) => view.selected = selected);
        this.parentEl.classList.remove("previewing");
      }, false);

      subtractButton.addEventListener("mouseenter", () => {
        this.showPreview(getSubSelection());
        this.isPreviewing = true;
      }, false);

      subtractButton.addEventListener("mouseleave", () => {
        this.hidePreview();
        this.isPreviewing = false;
      }, false);


      // Invert
      // -----------------------------------------------------------------------

      const invertButton = document.createElement("div");
      invertButton.classList.add("button");
      invertButton.classList.add("subtract");
      invertButton.textContent = "I";
      buttons.appendChild(invertButton);

      const getInvertSelection = (): HistoryItem => {
        const currentStateEntries = Array.from(this.history[0].entries());
        const invertState: HistoryItem = new Map(currentStateEntries.map(([view, selected]) => {

          return <HistoryPair>[view, historyItem.get(view) && !selected];
        }));
        return invertState;

      };

      invertButton.addEventListener("click", () => {
        const invertSelection = getInvertSelection();
        invertSelection.forEach((selected, view) => view.selected = selected);
        this.parentEl.classList.remove("previewing");
      }, false);

      invertButton.addEventListener("mouseenter", () => {
        this.showPreview(getInvertSelection());
        this.isPreviewing = true;
      }, false);

      invertButton.addEventListener("mouseleave", () => {
        this.hidePreview();
        this.isPreviewing = false;
      }, false);

    });
  }
}
