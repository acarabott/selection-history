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
  @observable
  protected history!: HistoryItem[];
  protected historyObs!: Obs;
  protected _isPreviewing!: boolean;
  protected canPreview: boolean;

  constructor(parentEl: HTMLElement) {
    this.el = document.createElement("div");
    this.el.classList.add("selectionHistory");

    this.parentEl = parentEl;
    this._historyItemHeight = 50;
    this.currentSelection = [];
    this.history = [];
    this.canPreview = true;


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

  render() {
    Array.from(this.el.children).forEach(child => this.el.removeChild(child));

    type SelectionCheck = (inHistory: boolean, inCurrent: boolean) => boolean;
    const animationDurationMs = 250;

    this.history.forEach((historyItem, i) => {
      // Helper funcs
      // ------------
      const getSelection = (test: SelectionCheck): HistoryItem => {
        const currentStateEntries = Array.from(this.history[0].entries());
        return new Map(currentStateEntries.map(([view, inCurrent]) => {
          const inHistory = historyItem.has(view) && historyItem.get(view)!;
          const isSelected = test(inHistory, inCurrent)
          return <HistoryPair>[view, isSelected];
        }));
      };

      const addButtonAction = (button: HTMLElement, check: SelectionCheck) => {
        button.classList.add("button");

        button.addEventListener("click", () => {
          this.canPreview = false;
          setTimeout(() => this.canPreview = true, animationDurationMs * 1.5);

          const selection = getSelection(check);
          selection.forEach((selected, view) => view.selected = selected);
          this.addToHistory(selection);
          this.parentEl.classList.remove("previewing");
        }, false);

        button.addEventListener("mouseenter", () => {
          const selection = getSelection(check);
          if (this.canPreview) {
            this.showPreview(selection);
            this.isPreviewing = true;
          }
        }, false);

        button.addEventListener("mouseleave", () => {
          this.hidePreview();
          this.isPreviewing = false;
        }, false);
      };

      // View
      // ------------
      const view = document.createElement("div");
      view.classList.add("history-item");

      const isFirst = i === 0;
      if (isFirst) {
        view.style.marginTop = `${-this.historyItemHeight}px`;
        view.classList.add("first");
        view.style.animationDuration = `${animationDurationMs}Ms`;
      }
      view.style.height = `${this.historyItemHeight}px`;

      this.el.appendChild(view);

      const number = document.createElement("div");
      number.classList.add("history-number");
      number.textContent = `${this.history.length - i}`;
      view.appendChild(number);

      // Preview / Body
      // --------------
      const preview = document.createElement("div");
      view.appendChild(preview);
      preview.classList.add("preview-view");
      addButtonAction(preview, (inHistory) => inHistory);

      historyItem.forEach((selected, view) => {
        const clone = view.cloneEl();
        const isSelected = selected;

        isSelected ? clone.classList.add("selected")
                   : clone.classList.remove("selected");
        clone.classList.remove("hover");

        preview.appendChild(clone);
      });

      // Buttons
      // -------
      const buttons = document.createElement("div");
      buttons.classList.add("buttons");
      view.appendChild(buttons);

      interface IButtonDef {
        name: string;
        textContent: string;
        check: SelectionCheck;
      };

      const buttonDefs: IButtonDef[] = [
        {
          name: "add",
          textContent: "+",
          check: (inHistory, inCurrent) => inCurrent || inHistory
        },
        {
          name: "subtract",
          textContent: "-",
          check: (inHistory, inCurrent) => inCurrent && !inHistory
        },
        {
          name: "anti",
          textContent: "A",
          check: (inHistory, inCurrent) => (!inCurrent && inHistory) ||
                                           (inCurrent && !inHistory)
        },
        {
          name: "inverse",
          textContent: "I",
          check: (inHistory) => !inHistory
        },
      ];

      buttonDefs.forEach((buttonDef, _i, array) => {
        const button = document.createElement("div");
        button.classList.add(buttonDef.name);
        button.textContent = buttonDef.textContent;
        button.style.height = `${100 / array.length}%`;
        buttons.appendChild(button);
        addButtonAction(button, buttonDef.check);
      });
    });
  }
}
