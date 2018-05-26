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
  protected inputPointClient: IPoint;
  protected _tl!: IPoint;
  protected _br!: IPoint;
  protected clickPoint: IPoint;
  protected combining: boolean;
  protected isPointerDown: boolean;
  protected _isDragSelecting!: boolean;
  protected touchedTarget: HTMLElement | undefined;


  constructor() {
    this.el = document.createElement("div");
    this.el.classList.add("drag-selection");
    document.body.appendChild(this.el);

    this.isPointerDown = false;
    this.clickPoint = { x: 0, y: 0 };

    this.previousSelectionState = new Map();
    this.tl = { x: 0, y: 0 };
    this.br = { x: 100, y: 100 };
    this.isDragSelecting = false;
    this.inputPointClient = { x: 0, y: 0 };
    this.combining = false;


    document.addEventListener("mousedown", evt => this.onMouseDown(evt), false);
    document.addEventListener("mousemove", evt => this.onMouseMove(evt), false);
    document.addEventListener("mouseup",   evt => this.onMouseUp(evt), false);

    document.addEventListener("touchstart", evt => this.onTouchStart(evt), false);
    document.addEventListener("touchmove",  evt => this.onTouchMove(evt), false);
    document.addEventListener("touchend",   evt => this.onTouchEnd(evt), false);

    document.addEventListener("keydown", evt => this.onKeyDown(evt), false);
    document.addEventListener("keyup",   evt => this.onKeyUp(evt), false);
  }

  get isDragSelecting() { return this._isDragSelecting; }
  set isDragSelecting(isDragSelecting) {
    this._isDragSelecting = isDragSelecting;
    isDragSelecting ? document.body.classList.add("isDragSelecting")
                    : document.body.classList.remove("isDragSelecting");
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

  updateInputPoints(event: IPointerEvent) {
    this.inputPointClient = this.getPointFromEvent(event);
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
    this.isPointerDown = true;
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

    this.tl = this.inputPointClient;
    this.br = this.inputPointClient;
    this.clickPoint = this.inputPointClient;
  }

  overlapsRect(rect: IRect) {
    return this.br.x > rect.x &&
           this.tl.x < rect.x + rect.width &&
           this.br.y > rect.y &&
           this.tl.y < rect.y + rect.height;
  }

  updateSelection() {
    this.tl = {
      x: Math.min(this.inputPointClient.x, this.clickPoint.x),
      y: Math.min(this.inputPointClient.y, this.clickPoint.y)
    };

    this.br = {
      x: Math.max(this.inputPointClient.x, this.clickPoint.x),
      y: Math.max(this.inputPointClient.y, this.clickPoint.y)
    };

    SelectableView.all.forEach(view => {
      const isOverlapping = this.overlapsRect(view.rect);
      const wasSelected = this.previousSelectionState.get(view);

      view.selected = this.combining
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
