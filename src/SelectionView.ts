import { Obs } from "./Obs";
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

  public selectionStateObs: Obs<SelectableView[]>;

  protected parentEl: HTMLElement;
  protected parentRectCached: IRect;
  protected parentRectCacheValid: boolean;
  protected previousSelectionState: Map<SelectableView, boolean>;
  protected inputPoint: IPoint;
  protected _tl: IPoint;
  protected _br: IPoint;
  protected clickPoint: IPoint;
  protected _combining!: boolean;
  protected isPointerDown: boolean;
  protected _isDragSelecting!: boolean;
  protected touchedTarget: HTMLElement | undefined;

  constructor(parentEl: HTMLElement) {
    this.parentEl = parentEl;
    this.parentRectCached = { x: 0, y: 0, width: 0, height: 0 };
    this.parentRectCacheValid = false;

    window.addEventListener("resize", () => {
      this.parentRectCacheValid = false;
    }, false);

    this.el = document.createElement("div");
    this.el.classList.add("drag-selection");
    document.body.appendChild(this.el);

    this.selectionStateObs = new Obs(<SelectableView[]>[]);
    this.isPointerDown = false;
    this.clickPoint = { x: 0, y: 0 };

    this.previousSelectionState = new Map();

    this._tl = { x: 0, y: 0 };
    this._br = { x: 100, y: 100 };
    this.isDragSelecting = false;
    this.inputPoint = { x: 0, y: 0 };
    this.isCombining = false;


    parentEl.addEventListener("mousedown", evt => this.onMouseDown(evt), false);
    document.addEventListener("mousemove", evt => this.onMouseMove(evt), false);
    document.addEventListener("mouseup",   evt => this.onMouseUp(evt), false);

    parentEl.addEventListener("touchstart", evt => this.onTouchStart(evt), false);
    document.addEventListener("touchmove",  evt => this.onTouchMove(evt), false);
    document.addEventListener("touchend",   evt => this.onTouchEnd(evt), false);

    document.addEventListener("keydown", evt => this.onKeyDown(evt), false);
    document.addEventListener("keyup",   evt => this.onKeyUp(evt), false);
  }

  get selectionState() { return this.selectionStateObs.value; }
  set selectionState(selectionState) { this.selectionStateObs.value = selectionState; }

  get isCombining() { return this._combining;}
  set isCombining(isCombining) {
    this._combining = isCombining;
    this.isCombining ? document.body.classList.add("isCombining")
                     : document.body.classList.remove("isCombining");
  }

  get isDragSelecting() { return this._isDragSelecting; }
  set isDragSelecting(isDragSelecting) {
    this._isDragSelecting = isDragSelecting;
    isDragSelecting ? document.body.classList.add("isDragSelecting")
                    : document.body.classList.remove("isDragSelecting");
  }

  updateTransform() {
    const translate = `translate3d(${this.tl.x}px, ${this.tl.y}px, 0)`;

    const width = this.br.x - this.tl.x;
    const height = this.br.y - this.tl.y;
    const scale = `scale3d(${width}, ${height}, 1)`;

    this.el.style.transform = `${translate} ${scale}`;
  }

  get tl() { return this._tl; }
  set tl(tl) {
    this._tl = tl;
    this.updateTransform();
  }

  get parentRect() {
    if (!this.parentRectCacheValid) {
      const parentRect = this.parentEl.getBoundingClientRect();
      this.parentRectCached = {
        x: parentRect.left,
        y: parentRect.top,
        width: parentRect.width,
        height: parentRect.height
      };
      this.parentRectCacheValid = true;
    }
    return this.parentRectCached;
  }

  get br() { return this._br; }
  set br(br) {
    this._br = {
      x: Math.min(br.x, this.parentRect.x + this.parentRect.width),
      y: br.y
    };
    this.updateTransform();
  }

  onKeyDown(event: KeyboardEvent) {
    if (["ShiftLeft", "ShiftRight"].includes(event.code)) {
      this.isCombining = true;
      if (this.isDragSelecting) {
        this.updateSelection();
      }
    }
  }

  onKeyUp(event: KeyboardEvent) {
    if (["ShiftLeft", "ShiftRight"].includes(event.code) && !event.shiftKey) {
      this.isCombining = false;
      if (this.isDragSelecting) {
        this.updateSelection();
      }
    }
  }

  getPointFromEvent(event: IPointerEvent) {
    return { x: event.clientX, y: event.clientY };
  }

  onMouseDown(event: MouseEvent) {
    this.touchedTarget = event.target as HTMLElement;
    this.inputPoint = this.getPointFromEvent(event);
    this.onPointerDown();
  }

  onMouseMove(event: MouseEvent) {
    this.inputPoint = this.getPointFromEvent(event);
    this.onPointerMove();
  }

  onMouseUp(event: MouseEvent) {
    this.inputPoint = this.getPointFromEvent(event);
    this.onPointerUp();
  }

  updateTouchInputPoints(event: TouchEvent) {
    if (event.changedTouches.length === 0) { return; }
    const pointerEvent: IPointerEvent = event.changedTouches[0];
    this.inputPoint = this.getPointFromEvent(pointerEvent);
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
    this.isPointerDown = true;
    this.previousSelectionState = new Map(SelectableView.all.map(sel => {
      return <[SelectableView, boolean]>[sel, sel.selected];
    }));

    const selectable = this.touchedTarget === undefined
      ? undefined
      : SelectableView.getFromEl(this.touchedTarget);
    const didClickSelectable = selectable instanceof SelectableView;

    if (this.isCombining) {
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

    this.tl = this.inputPoint;
    this.br = this.inputPoint;
    this.clickPoint = this.inputPoint;
  }

  overlapsRect(rect: IRect) {
    return this.tl.x < rect.x + rect.width &&
           this.br.x > rect.x &&
           this.tl.y < rect.y + rect.height &&
           this.br.y > rect.y;
  }

  updateSelection() {
    this.tl = {
      x: Math.min(this.inputPoint.x, this.clickPoint.x),
      y: Math.min(this.inputPoint.y, this.clickPoint.y)
    };

    this.br = {
      x: Math.max(this.inputPoint.x, this.clickPoint.x),
      y: Math.max(this.inputPoint.y, this.clickPoint.y)
    };

    SelectableView.all.forEach(view => {
      const isOverlapping = this.overlapsRect(view.rect);
      const wasSelected = this.previousSelectionState.has(view)
        ? this.previousSelectionState.get(view)!
        : false;

      view.selected = this.isCombining
        ? isOverlapping
          ? !wasSelected
          : wasSelected
        : isOverlapping;
    });
  }

  onPointerMove() {
    if (this.isPointerDown && !this.isDragSelecting) {
      this.isDragSelecting = true;
    }

    if (!this.isDragSelecting) { return; }

    this.updateSelection();
  }

  onPointerUp() {
    this.isPointerDown = false;
    this.isDragSelecting = false;
    this.selectionState = SelectableView.all;
  }
}
