import { HistoryItem, SelectionCheck } from "./SelectionHistoryView";

interface IButtonDef {
  name: string;
  check: SelectionCheck;
};

export class HistoryItemView {
  public el: HTMLElement;

  public onAnyButtonClick: (check: SelectionCheck) => void;
  public onAnyButtonEnter: (check: SelectionCheck) => void;
  public onAnyButtonLeave: () => void;

  protected historyItem: HistoryItem;

  protected _label: number;
  protected labelEl: HTMLElement;

  protected previewEl: HTMLElement;
  protected buttonsEl: HTMLElement;

  protected previewStates: Map<HTMLElement, boolean>;

  constructor(historyItem: HistoryItem) {
    this.historyItem = historyItem;

    this.onAnyButtonClick = () => {};
    this.onAnyButtonEnter = () => {};
    this.onAnyButtonLeave = () => {};

    this.el = document.createElement("div");
    this.el.classList.add("history-item");

    this._label = 1;
    this.labelEl = document.createElement("div");
    this.labelEl.classList.add("history-label");
    this.el.appendChild(this.labelEl);

    this.previewEl = document.createElement("div");
    this.previewEl.classList.add("preview-view");
    this.el.appendChild(this.previewEl);
    this.addButtonAction(this.previewEl, (inHistory) => inHistory, false);

    this.buttonsEl = document.createElement("div");
    this.buttonsEl.classList.add("buttons");
    this.el.appendChild(this.buttonsEl);

    this.previewStates = new Map<HTMLElement, boolean>();

    this.historyItem.forEach((selected, view) => {
      const clone = view.cloneEl();
      const isSelected = selected;

      isSelected ? clone.classList.add("selected")
                 : clone.classList.remove("selected");
      clone.classList.remove("hover");

      this.previewEl.appendChild(clone);
    });

    const buttonDefs: IButtonDef[] = [
      {
        name: "add",
        check: (inHistory, inCurrent) => inCurrent || inHistory
      },
      {
        name: "subtract",
        check: (inHistory, inCurrent) => inCurrent && !inHistory
      },
      {
        name: "xor",
        check: (inHistory, inCurrent) => Boolean(Number(inHistory) ^ Number(inCurrent))
      },
      {
        name: "intersection",
        check: (inHistory, inCurrent) => inCurrent && inHistory
      },
      {
        name: "inverse",
        check: (inHistory) => !inHistory
      },
    ];

    buttonDefs.forEach((buttonDef, _i, array) => {
      const button = document.createElement("div");
      button.classList.add("button");
      button.classList.add(buttonDef.name);

      this.previewStates.set(button, false);

      ["rect-a", "rect-b", "rect-c"].forEach(iconClass => {
        const div = document.createElement("div");
        div.classList.add("rect", iconClass);
        button.appendChild(div);
      });

      button.style.height = `${100 / array.length}%`;
      this.buttonsEl.appendChild(button);
      this.addButtonAction(button, buttonDef.check, true);
    });
  }

  addButtonAction(button: HTMLElement, check: SelectionCheck,
                  useTouchPreview: boolean) {
    button.classList.add("button");

    button.addEventListener("click", () => {
      this.onAnyButtonClick(check);
    }, false);

    button.addEventListener("mouseenter", () => {
      this.onAnyButtonEnter(check);
    }, false);

    button.addEventListener("mouseleave", () => {
      this.onAnyButtonLeave();
    }, false);

    if (useTouchPreview) {
      button.addEventListener("touchstart", event => {
        event.preventDefault();

        const allButtons = Array.from(this.previewStates.keys());
        const otherButtons = allButtons.filter(key => key !== button);
        otherButtons.forEach(key => this.previewStates.set(key, false));

        const isPreviewing = this.previewStates.get(button)!;

        isPreviewing
          ? this.onAnyButtonClick(check)
          : this.onAnyButtonEnter(check);

        this.previewStates.set(button, !isPreviewing);
      }, false);
    }
  };


  get label() { return this._label; }
  set label(label) {
    this._label = label;
    this.labelEl.textContent = `${label}`;
  }

  slideIn(historyItemHeightVH: number, animationDurationMs: number) {
    this.el.style.marginTop = `${-historyItemHeightVH}vh`;
    this.el.classList.add("first");
    this.el.style.animationDuration = `${animationDurationMs}Ms`;
    this.el.style.height = `${historyItemHeightVH}vh`;
  }
}
