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
Array.from(Array(numTracks)).forEach(() => {
  const track = document.createElement("div");
  track.classList.add("track");
  container.appendChild(track);

  const addSelectableView = (xPct: number) => {
    const x = `${xPct}%`;
    const y = "0%";
    const maxWidth = 100 - xPct;
    const widthPct = Math.min(randomInt(5, 20), maxWidth);
    const width = `${widthPct}%`;
    const height = "100%";
    new SelectableView(track, x, y, width, height);

    const margin = randomInt(0, 25);
    const right = xPct + widthPct + margin;
    if (right < 95) {
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


const selectionView = new SelectionView(container);
selectionView.selectionStateObs.subscribe((selectables: SelectableView[]) => {
  selectionHistory.currentSelection = selectables;
});

// TODO touch support (shift key)
// TODO better item placement (video editing? )
// TODO button icons
