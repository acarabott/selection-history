import { SelectableView } from "./SelectableView";
import { SelectionHistoryView } from "./SelectionHistoryView";
import { SelectionView } from "./SelectionView";

function randomInt(min: number, max: number) {
  return Math.floor(min + (Math.random() * (max - min)));
}

const container = document.createElement("div");
container.classList.add("container");
document.body.appendChild(container);

Array.from(Array(5)).forEach(() => {
  const x = `${randomInt(20, 80)}%`;
  const y = `${randomInt(20, 80)}%`;
  const length = `${randomInt(10, 20)}%`;
  new SelectableView(container, x, y, length, length);
});

const selectionHistory = new SelectionHistoryView(container);

document.body.appendChild(selectionHistory.el);

const onResize = () => {
  const containerRect = container.getBoundingClientRect();
  const heightToWidthRatio = containerRect.height / containerRect.width;

  const historyRect = selectionHistory.el.getBoundingClientRect();
  selectionHistory.historyItemHeight = historyRect.width * heightToWidthRatio;
};

window.addEventListener("resize", onResize, false);
onResize();


const selectionView = new SelectionView(container);
selectionView.selectionStateObs.subscribe((selectables: SelectableView[]) => {
  selectionHistory.currentSelection = selectables;
});

// TODO final button types
// TODO touch support (shift key)
// TODO better item placement (video editing? )
// TODO button icons
