import { Obs } from "./Obs";
import { SelectableView } from "./SelectableView";
import { HistoryItemView } from "./HistoryItemView";

export type HistoryItem = Map<SelectableView, boolean>;
export type HistoryPair = [SelectableView, boolean];
export type SelectionCheck = (inHistory: boolean, inCurrent: boolean) => boolean;


export class SelectionHistoryView {
  public  el: HTMLElement;

  protected currentSelectionObs: Obs<SelectableView[]>;
  protected historyObs: Obs<HistoryItem[]>;
  protected _isPreviewing!: boolean;
  protected canPreview: boolean;
  protected historyItemViews: HistoryItemView[];

  constructor() {
    this.el = document.createElement("div");
    this.el.classList.add("selectionHistory");

    this.currentSelectionObs = new Obs(<SelectableView[]>[]);
    this.historyObs = new Obs(<HistoryItem[]>[]);
    this.canPreview = true;
    this.historyItemViews = [];

    this.currentSelectionObs.subscribe((selectables: SelectableView[]) => {
      this.addToHistory(new Map(selectables.map(selectable => {
        return <HistoryPair>[selectable, selectable.selected];
      })));
    });

    this.historyObs.subscribe(history => this.render(history[0]));
  }

  get currentSelection() { return this.currentSelectionObs.value; }
  set currentSelection(currentSelection) { this.currentSelectionObs.value = currentSelection; }

  get history() { return this.historyObs.value; }
  set history(history) { this.historyObs.value = history; }

  get isPreviewing() { return this._isPreviewing; }
  set isPreviewing(isPreviewing) {
    this._isPreviewing = isPreviewing;
    isPreviewing
      ? document.body.classList.add("previewing")
      : document.body.classList.remove("previewing");
  }

  addToHistory(item: HistoryItem) {
    const selectedStates = Array.from(item.values());
    const someSelected = selectedStates.some(bool => bool);
    if (!someSelected) { return; }

    const haveHistory = this.history.length > 0;
    if (haveHistory) {
      const hasChanged = Array.from(item.entries()).map(([sel, newState]) => {
        const currentState = this.history[0].get(sel);
        return newState !== currentState;
      }).some(hasChanged => hasChanged);
      if (!hasChanged) { return; }
    }

    this.history.unshift(item);
    this.historyObs.notify();
  }

  showPreview(item: HistoryItem) {
    item.forEach((selected, view) => view.preview = selected);
  }

  hidePreview() {
    this.currentSelection.forEach(item => item.preview = false);
  }

  render(historyItem: HistoryItem) {
    const animationDurationMs = 250;
    const historyItemHeightVH = 25; // bad! hard coded from CSS

    const historyItemView = new HistoryItemView(historyItem);
    this.historyItemViews.push(historyItemView);
    historyItemView.label = this.historyItemViews.length;

    this.el.insertBefore(historyItemView.el,
                         this.el.childNodes[0]);
    historyItemView.slideIn(historyItemHeightVH, animationDurationMs);

    const getSelection = (test: SelectionCheck): HistoryItem => {
      const currentStateEntries = Array.from(this.history[0].entries());
      return new Map(currentStateEntries.map(([view, inCurrent]) => {
        const inHistory = historyItem.has(view) && historyItem.get(view)!;
        const isSelected = test(inHistory, inCurrent)
        return <HistoryPair>[view, isSelected];
      }));
    };

    historyItemView.onAnyButtonClick = (check) => {
      this.canPreview = false;
      setTimeout(() => this.canPreview = true, animationDurationMs * 1.5);

      const selection = getSelection(check);
      selection.forEach((selected, view) => view.selected = selected);
      this.addToHistory(selection);
      document.body.classList.remove("previewing");
    };

    historyItemView.onAnyButtonEnter = (check) => {
      const selection = getSelection(check);
      if (this.canPreview) {
        this.showPreview(selection);
        this.isPreviewing = true;
      }
    };

    historyItemView.onAnyButtonLeave = () => {
      this.hidePreview();
      this.isPreviewing = false;
    };
  }
}
