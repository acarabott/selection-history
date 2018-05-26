import { SelectableView } from "./SelectableView";
import { SelectionHistoryView } from "./SelectionHistoryView";
import { SelectionView } from "./SelectionView";

function randomInt(min: number, max: number) {
  return Math.floor(min + (Math.random() * (max - min)));
}

const leftSide = document.createElement("div");
leftSide.id = "left";
document.body.appendChild(leftSide);

const rightSide = document.createElement("div");
rightSide.id = "right";
document.body.appendChild(rightSide);

const container = document.createElement("div");
container.classList.add("container");
leftSide.appendChild(container);

const numTracks = 4;
const containerHeightVH = 60;
Array.from(Array(numTracks)).forEach((_, t) => {
  const trackHeightVH = containerHeightVH / numTracks;

  const track = document.createElement("div");
  track.classList.add("track");
  track.style.height = `${trackHeightVH}vh`;
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

const selectionView = new SelectionView(leftSide);
selectionView.selectionStateObs.subscribe((selectables: SelectableView[]) => {
  selectionHistory.currentSelection = selectables;
});



const selectionHistory = new SelectionHistoryView();
rightSide.appendChild(selectionHistory.el);

// TODO touch support (shift key)
// TODO button icons
// TODO delete button?
