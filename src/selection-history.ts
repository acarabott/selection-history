import { SelectableView } from "./SelectableView";
import { SelectionHistoryView } from "./SelectionHistoryView";
import { SelectionView } from "./SelectionView";

function randomInt(min: number, max: number) {
  return Math.floor(min + (Math.random() * (max - min)));
}

const container = document.createElement("div");
container.classList.add("container");
document.body.appendChild(container);

const numTracks = 4;
Array.from(Array(numTracks)).forEach((_, t) => {
  const track = document.createElement("div");
  track.classList.add("track");
  container.appendChild(track);

  const addSelectableView = (xPct: number) => {
    const x = `${xPct}%`;
    const heightPct = 100 / numTracks;
    const yPct = t * heightPct;
    const y = `${yPct}%`;
    const maxWidth = 100 - xPct;
    const widthPct = Math.min(randomInt(5, 20), maxWidth);
    const width = `${widthPct}%`;
    const height = `${heightPct}%`;
    new SelectableView(container, x, y, width, height);

    const margin = randomInt(0, 25);
    const right = xPct + widthPct + margin;

    const trackFullThresh = 95;
    const finished = right > trackFullThresh;

    if (!finished) {
      addSelectableView(right);
    }
  };

  addSelectableView(0);
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


const selectionView = new SelectionView();
selectionView.selectionStateObs.subscribe((selectables: SelectableView[]) => {
  selectionHistory.currentSelection = selectables;
});

// TODO touch support (shift key)
// TODO button icons
// TODO delete button?
