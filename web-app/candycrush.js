import R from "./ramda.js";

const candycrush = Object.create(null);

// WORKING FUNCTIONS
candycrush.swapCandies = function (td1, td2, grid) {
  const bg1 = td1.style.backgroundImage;
  const bg2 = td2.style.backgroundImage;
  const class1 = td1.className;
  const class2 = td2.className;

  td1.style.backgroundImage = bg2;
  td2.style.backgroundImage = bg1;

  td1.className = class2;
  td2.className = class1;

  // Swap data in the array
  const [row1, col1] = td1.dataset.position.split(",").map(Number);
  const [row2, col2] = td2.dataset.position.split(",").map(Number);

  const temp = grid[row1][col1];
  grid[row1][col1] = grid[row2][col2];
  grid[row2][col2] = temp;
};

candycrush.isAdjacent = function(td1, td2) {
  const id1 = td1.dataset.position.split(",").map(Number);
  const id2 = td2.dataset.position.split(",").map(Number);
  const [row1, col1] = id1;
  const [row2, col2] = id2;

  const rowDiff = Math.abs(row1 - row2);
  const colDiff = Math.abs(col1 - col2);

  return (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);
}

// MATCH FUNCTIONS

/**
 * 
 * curried
 * @sig bleh
 * @private
 */

// player_has_win_in_column
/* const three_matched_in_row = function (candy) {
    return function (row) {
        return R.includes(
            [candy, candy, candy],
            R.aperture(3, row)
        );
    };
};

// player_has_vertical_win
const horizontal_match_of_three = function (candy, grid) {
    return R.any(three_matched_in_row(candy), grid);
};

//player_has_horizontal_win
const vertical_match_of_three = function (candy, grid) {
    return R.any(three_matched_in_row(candy), R.transpose(grid));
}; */


// ARE YA WINNNING SON


// REMOVE FUNCTIONS

// Returns an array of [row, col] positions for horizontal matches of 3
const horizontal_match_positions = function (grid) {
  return R.addIndex(R.chain)((row, rowIndex) =>
    R.addIndex(R.chain)((_, colIndex) => {
      const window = row.slice(colIndex, colIndex + 3);
      return window.length === 3 && window.every(c => c === window[0])
        ? [[rowIndex, colIndex], [rowIndex, colIndex + 1], [rowIndex, colIndex + 2]]
        : [];
    })(row)
  )(grid);
};

const vertical_match_positions = function (grid) {
  const transposed = R.transpose(grid); // Flip rows <-> columns
  return R.addIndex(R.chain)((col, colIndex) =>
    R.addIndex(R.chain)((_, rowIndex) => {
      const window = col.slice(rowIndex, rowIndex + 3);
      return window.length === 3 && window.every(c => c === window[0])
        ? [[rowIndex, colIndex], [rowIndex + 1, colIndex], [rowIndex + 2, colIndex]]
        : [];
    })(col)
  )(transposed);
};


//chatgpt
const removeMatchedPositions = function (grid, matchedPositions) {
  const matchSet = new Set(matchedPositions.map(([r, c]) => `${r},${c}`));

  return R.addIndex(R.map)((row, rowIndex) =>
    R.addIndex(R.map)((candy, colIndex) =>
      matchSet.has(`${rowIndex},${colIndex}`) ? null : candy
    )(row)
  )(grid);
};

candycrush.removeHorizontalMatches = function (grid) {
  const matches = horizontal_match_positions(grid);
  return removeMatchedPositions(grid, matches);
};

candycrush.removeVerticalMatches = function (grid) {
  const matches = vertical_match_positions(grid);
  return removeMatchedPositions(grid, matches);
};

candycrush.removeMatches = function (grid) {
  const horizontalMatches = horizontal_match_positions(grid);
  const verticalMatches = vertical_match_positions(grid);
  const allMatches = [...horizontalMatches, ...verticalMatches];
  
  return removeMatchedPositions(grid, allMatches);
};

// update board

candycrush.updateBoardVisuals = function (board, grid, candies) {
  board.forEach((row, rowIndex) => {
    row.forEach((td, colIndex) => {
      const candyType = grid[rowIndex][colIndex];

      if (candyType === null) {
        td.style.backgroundImage = "none";
        td.className = td.classList.contains("selected") ? "selected" : "";
      } else {
        const isSelected = td.classList.contains("selected");
        td.className = `candy-${candyType}` + (isSelected ? " selected" : "");
        td.style.backgroundImage = candies[candyType];
      }
    });
  });
};

// ===== Utility =====
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ===== Cascade Logic =====
const cascadeGrid = grid =>
  R.pipe(
    R.transpose,
    R.map(col => {
      const nonNulls = R.filter(R.complement(R.isNil), col);
      const missing = R.repeat(null, col.length - nonNulls.length);
      return R.concat(missing, nonNulls); // Push nulls to top
    }),
    R.transpose
  )(grid);

// ===== Candy Fill =====
candycrush.fillNewCandies = function (grid, randomCandy) {
  return R.map(
    row => R.map(
      cell => (cell === null ? randomCandy() : cell),
      row
    ),
    grid
  );
};


// ===== Match Detection =====
candycrush.matchPositions = function (grid) {
  const h = horizontal_match_positions(grid);
  const v = vertical_match_positions(grid);
  return R.uniqWith(R.equals, R.concat(h, v));
};

// update score :P
const updateScoreDisplay = (gameState) => {
  document.getElementById("score-display").textContent = `Score: ${gameState.score}`;
  console.log(`Score updated: ${gameState.score}`);
};

// ===== Resolve Matches with Delay (for animation cycle) =====
candycrush.resolveMatches = async function (grid, board, candies, gameState, randomCandy) {
  while (true) {
    const matches = candycrush.matchPositions(grid);
    if (matches.length === 0) break;

    const removed = removeMatchedPositions(grid, matches);
    const cascaded = cascadeGrid(removed);
    const refilled = candycrush.fillNewCandies(cascaded, randomCandy);

    candycrush.updateBoardVisuals(board, refilled, candies);
    grid.splice(0, grid.length, ...refilled);

    await sleep(200); // Delay between each resolution pass
    
    // update score
    gameState.score += 10;
    updateScoreDisplay(gameState);
  }
};

// ===== Animate Cascade Step-by-Step =====
candycrush.animateCascade = async function (grid, board, candies) {
  const rowCount = grid.length;
  const colCount = grid[0].length;

  for (let col = 0; col < colCount; col++) {
    for (let row = rowCount - 2; row >= 0; row--) {
      let target = row;
      while (target + 1 < rowCount && grid[target + 1][col] === null) {
        target++;
      }

      if (target !== row) {
        // Move candy in grid
        grid[target][col] = grid[row][col];
        grid[row][col] = null;

        // Move candy visually
        const tdFrom = board[row][col];
        const tdTo = board[target][col];

        tdTo.className = tdFrom.className;
        tdTo.style.backgroundImage = tdFrom.style.backgroundImage;

        tdFrom.className = "";
        tdFrom.style.backgroundImage = "";

        await sleep(100);
      }
    }
  }
};



 // OLD STUFF
/**
 * Create a new empty board.
 * Optionally with a specified width and height,
 * otherwise returns a standard 7 wide, 6 high board.
 * @memberof Connect4
 * @function
 * @param {number} [width = 8] The width of the new board.
 * @param {number} [height = 8] The height of the new board.
 * @returns {Connect4.Board} An empty board for starting a game.
 */


/**
 * @returns candycrush.Grid
 * @param {*} icon1 
 * @param {*} icon2 
 */
candycrush.swap = function (icon1, icon2, grid) {
};

/**
 * @returns candycrush.Player
 */
candycrush.player_to_ply = function () {
};

/**
 * @returns Boolean
 */
candycrush.is_game_ended = function (grid) {
};

candycrush.is_game_won = function (grid) {

};
candycrush.is_game_won_for_player = function (player) {
    return function (grid){

    };
};

candycrush.parrot = 1;
candycrush.treasure = 2;

export default Object.freeze(candycrush);

