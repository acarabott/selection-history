import { Obs, observable } from "./Obs";
import { SelectableView } from "./SelectableView";

interface IPoint {
  x: number;
  y: number;
}

interface IRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface IPointerEvent {
  clientX: number;
  clientY: number;
}

export class SelectionView {
  public el: HTMLElement;
  @observable
  public selectionState!: SelectableView[];
  public selectionStateObs!: Obs;

  protected previousSelectionState: Map<SelectableView, boolean>;
  protected parent: HTMLElement;
  protected inputPointRelative: IPoint;
  protected inputPointClient: IPoint;
  protected _tl!: IPoint;
  protected _br!: IPoint;
  protected clickPoint: IPoint;
  protected combining: boolean;
  protected _isDragSelecting!: boolean;
  protected touchedTarget: HTMLElement | undefined;


  constructor(parent: HTMLElement) {
    this.parent = parent;
    this.el = document.createElement("div");
    this.el.classList.add("drag-selection");

    this._tl;
    this._br;
    this._isDragSelecting;
    this.clickPoint = { x: 0, y: 0 };

    this.previousSelectionState = new Map();
    this.tl = { x: 0, y: 0 };
    this.br = { x: 100, y: 100 };
    this.isDragSelecting = false;
    this.inputPointRelative = { x: 0, y: 0 };
    this.inputPointClient = { x: 0, y: 0 };
    this.combining = false;

    parent.appendChild(this.el);

    this.onMouseDown = this.onMouseDown.bind(this);
    document.addEventListener("mousedown", this.onMouseDown, false);

    this.onMouseMove = this.onMouseMove.bind(this);
    document.addEventListener("mousemove", this.onMouseMove, false);

    this.onMouseUp = this.onMouseUp.bind(this);
    document.addEventListener("mouseup", this.onMouseUp, false);

    this.onTouchStart = this.onTouchStart.bind(this);
    document.addEventListener("touchstart", this.onTouchStart, false);

    document.addEventListener("touchmove", (e) => this.onTouchMove(e), false);
    document.addEventListener("touchend", (e) => this.onTouchEnd(e), false);

    this.onKeyDown = this.onKeyDown.bind(this);
    document.addEventListener("keydown", this.onKeyDown, false);

    this.onKeyUp = this.onKeyUp.bind(this);
    document.addEventListener("keyup", this.onKeyUp, false);
  }

  get isDragSelecting() { return this._isDragSelecting; }
  set isDragSelecting(isDragSelecting) {
    this._isDragSelecting = isDragSelecting;
    isDragSelecting ? this.el.classList.add("isDragSelecting")
           : this.el.classList.remove("isDragSelecting");
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

  onKeyDown(event: KeyboardEvent) {
    if (["ShiftLeft", "ShiftRight"].includes(event.code)) {
      this.combining = true;
      if (this.isDragSelecting) {
        this.updateSelection();
      }
    }
  }

  onKeyUp(event: KeyboardEvent) {
    if (["ShiftLeft", "ShiftRight"].includes(event.code) && !event.shiftKey) {
      this.combining = false;
      if (this.isDragSelecting) {
        this.updateSelection();
      }
    }
  }

  getPointFromEvent(event: IPointerEvent) {
    return { x: event.clientX, y: event.clientY } ;
  }

  getRelativePointFromEvent(event: IPointerEvent) {
    const absPoint = this.getPointFromEvent(event);
    const parentRect = this.parent.getBoundingClientRect();
    const x = absPoint.x - parentRect.left;
    const y = absPoint.y - parentRect.top;

    return { x, y };
  }

  updateInputPoints(event: IPointerEvent) {
    this.inputPointClient = this.getPointFromEvent(event);
    this.inputPointRelative = this.getRelativePointFromEvent(event);
  }

  onMouseDown(event: MouseEvent) {
    this.touchedTarget = event.target as HTMLElement;
    this.updateInputPoints(event);
    this.onPointerDown();
  }

  onMouseMove(event: MouseEvent) {
    this.updateInputPoints(event);
    this.onPointerMove();
  }

  onMouseUp(event: MouseEvent) {
    this.updateInputPoints(event);
    this.onPointerUp();
  }

  updateTouchInputPoints(event: TouchEvent) {
    if (event.changedTouches.length === 0) { return; }
    const pointerEvent: IPointerEvent = event.changedTouches[0];
    this.updateInputPoints(pointerEvent);
  }

  onTouchStart(event: TouchEvent) {
    this.touchedTarget = event.target as HTMLElement;
    this.updateTouchInputPoints(event);
    this.onPointerDown();
  }

  onTouchMove(event: TouchEvent) {
    this.updateTouchInputPoints(event);
    this.onPointerMove();
  }

  onTouchEnd(event: TouchEvent) {
    this.updateTouchInputPoints(event);
    this.onPointerUp();
  }

  onPointerDown() {
    this.previousSelectionState = new Map(SelectableView.all.map(sel => {
      return <[SelectableView, boolean]>[sel, sel.selected];
    }));


    const selectable = this.touchedTarget === undefined
      ? undefined
      : SelectableView.getFromEl(this.touchedTarget);
    const didClickSelectable = selectable instanceof SelectableView;

    if (this.combining) {
      if (didClickSelectable) {
        selectable!.selected = !selectable!.selected
      }
    }
    else {
      SelectableView.all.forEach(sel => {
        sel.selected = didClickSelectable
          ? sel === selectable
          : false;
      });
    }

    this.isDragSelecting = true;
    this.tl = this.inputPointRelative;
    this.br = this.inputPointRelative;
    this.clickPoint = this.inputPointRelative;
  }

  overlapsRect(rect: IRect) {
    return this.br.x > rect.x &&
           this.tl.x < rect.x + rect.width &&
           this.br.y > rect.y &&
           this.tl.y < rect.y + rect.height;
  }

  updateSelection() {
    this.tl = {
      x: Math.min(this.inputPointRelative.x, this.clickPoint.x),
      y: Math.min(this.inputPointRelative.y, this.clickPoint.y)
    };

    this.br = {
      x: Math.max(this.inputPointRelative.x, this.clickPoint.x),
      y: Math.max(this.inputPointRelative.y, this.clickPoint.y)
    };

    const parentRect = this.parent.getBoundingClientRect();

    SelectableView.all.forEach(view => {
      const selectClientRect = view.rect;

      const relativeRect: IRect = {
        x:      selectClientRect.x - parentRect.left,
        y:      selectClientRect.y - parentRect.top,
        width : selectClientRect.width,
        height: selectClientRect.height
      };

      const isOverlapping = this.overlapsRect(relativeRect);

      const wasSelected = this.previousSelectionState.get(view);

      view.selected = this.combining
        ? isOverlapping
          ? !wasSelected
          : wasSelected
        : isOverlapping;
    });
  }

  onPointerMove() {
    if (this.isDragSelecting) {
      if (this.el.style.display !== "block") { this.el.style.display = "block"; }
      this.updateSelection();
    }
    else {
      SelectableView.all.forEach(sel => {
        const clientRect = sel.rect;
        const rectContainsPoint = this.inputPointClient.x >= clientRect.x &&
                                  this.inputPointClient.y >= clientRect.y &&
                                  this.inputPointClient.x <= clientRect.x + clientRect.width &&
                                  this.inputPointClient.y <= clientRect.y + clientRect.height;
        sel.hover = rectContainsPoint;
      });
    }
  }

  onPointerUp() {
    this.isDragSelecting = false;
    this.selectionState = SelectableView.all;
    this.el.style.display = "none";
  }
}
