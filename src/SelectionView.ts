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

export class SelectionView {
  public el: HTMLElement;
  @observable
  public selectionState!: SelectableView[];
  public selectionStateObs!: Obs;

  protected previousSelectionState: Map<SelectableView, boolean>;
  protected parent: HTMLElement;
  protected _tl!: IPoint;
  protected _br!: IPoint;
  protected clickPoint!: IPoint;
  protected _isDragSelecting!: boolean;


  constructor(parent: HTMLElement) {
    this.parent = parent;
    this.el = document.createElement("div");
    this.el.classList.add("drag-selection");

    this._tl;
    this._br;
    this._isDragSelecting;
    this.clickPoint;

    this.previousSelectionState = new Map();
    this.tl = { x: 0, y: 0 };
    this.br = { x: 100, y: 100 };
    this.isDragSelecting = false;

    parent.appendChild(this.el);

    this.onPointerDown = this.onPointerDown.bind(this);
    this.parent.addEventListener("mousedown", this.onPointerDown, false);

    this.onPointerMove = this.onPointerMove.bind(this);
    this.onPointerUp = this.onPointerUp.bind(this);
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

  getPointFromEvent(event: MouseEvent) {
    return { x: event.clientX, y: event.clientY } ;
  }

  getRelativePointFromEvent(event: MouseEvent) {
    const absPoint = this.getPointFromEvent(event);
    const parentRect = this.parent.getBoundingClientRect();
    const x = absPoint.x - parentRect.left;
    const y = absPoint.y - parentRect.top;

    return { x, y };
  }

  onPointerDown(event: MouseEvent) {
    if (event.target === null) { return; }

    this.previousSelectionState = new Map(SelectableView.all.map(sel => {
      return <[SelectableView, boolean]>[sel, sel.selected];
    }));

    const selectable = SelectableView.getFromEl(event.target as HTMLElement);
    const didClickSelectable = selectable instanceof SelectableView;

    if (event.shiftKey) {
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
    const relativePoint = this.getRelativePointFromEvent(event);
    this.tl = relativePoint;
    this.br = relativePoint;
    this.clickPoint = relativePoint;

    document.addEventListener("mousemove", this.onPointerMove, false);
    document.addEventListener("mouseup", this.onPointerUp, false);
  }

  overlapsRect(rect: IRect) {
    return this.br.x > rect.x &&
           this.tl.x < rect.x + rect.width &&
           this.br.y > rect.y &&
           this.tl.y < rect.y + rect.height;
  }

  onPointerMove(event: MouseEvent) {
    const point = this.getRelativePointFromEvent(event);

    this.tl = {
      x: Math.min(point.x, this.clickPoint.x),
      y: Math.min(point.y, this.clickPoint.y)
    };

    this.br = {
      x: Math.max(point.x, this.clickPoint.x),
      y: Math.max(point.y, this.clickPoint.y)
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

      view.selected = event.shiftKey
        ? isOverlapping
          ? !wasSelected
          : wasSelected
        : isOverlapping;
    });
  }

  onPointerUp(event: MouseEvent) {
    this.isDragSelecting = false;
    this.selectionState = SelectableView.all;

    const point = this.getPointFromEvent(event);
    SelectableView.all.forEach(sel => {
      const clientRect = sel.rect;
      const rectContainsPoint = point.x >= clientRect.x &&
                                point.y >= clientRect.y &&
                                point.x <= clientRect.x + clientRect.width &&
                                point.y <= clientRect.y + clientRect.height;
      sel.hover = rectContainsPoint;
    });

    document.removeEventListener("mousemove", this.onPointerMove, false);
    document.removeEventListener("mouseup", this.onPointerUp, false);
  }
}
