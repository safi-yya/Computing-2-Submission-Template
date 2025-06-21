import R from "./ramda.js";
import candycrush from "./candycrush.js";

const row_count = 8;
const col_count = 8;
const candies = {
  1: "url(./assets/ship.png)",
  2: "url(./assets/map.png)",
  3: "url(./assets/parrot.png)",
  4: "url(./assets/hat.png)",
  5: "url(./assets/bottle.png)",
  6: "url(./assets/treasure.png)"
};

const candy_grid = [
  [1,1,2,3,4,1,1,4],
  [3,5,1,6,2,5,4,5],
  [3,1,5,3,3,2,5,6],
  [1,2,6,3,5,4,1,2],
  [1,4,6,2,6,6,1,2],
  [6,5,3,2,4,5,2,6],
  [2,3,4,5,6,6,5,3],
  [3,4,1,1,2,6,5,4]
];

const grid = document.getElementById("grid");
let firstSelected = null;


// FUNCTIONS NOT MOVED YET GO HERE


/*Generate our gorgeous candy board depending on start grid*/

const board = candy_grid.map(function (row, row_index) {

  const tr = document.createElement("tr");
  grid.append(tr);

  return row.map(function (candyType, col_index) {
    const td = document.createElement("td");

    td.className = `candy-${candyType}`;
    td.style.backgroundImage = candies[candyType];
    td.style.backgroundSize = "cover";
    td.dataset.position = `${row_index},${col_index}`;

    // Click to select or swap
    td.onclick = function () {
    if (!firstSelected) {
      firstSelected = td;
      td.classList.add("selected");
    } else if (td === firstSelected) {
      // Deselect if clicked again
      td.classList.remove("selected");
      firstSelected = null;
    } else {
      if (candycrush.isAdjacent(firstSelected, td)) {
        candycrush.swapCandies(firstSelected, td, candy_grid);
        candycrush.handleMatchesAndCascade(board, candy_grid, candies);
      }

    // Deselect both after attempt to swap
      firstSelected.classList.remove("selected");
      td.classList.remove("selected");
      firstSelected = null;
    }
  const newGrid = candycrush.removeMatches(candy_grid);
  

  candycrush.updateBoardVisuals(board, newGrid, candies);

// Update your grid reference
candy_grid.splice(0, candy_grid.length, ...newGrid);
  };

    tr.append(td);
    return td;
  });
});