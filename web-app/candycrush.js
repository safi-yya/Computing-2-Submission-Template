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
const three_matched_in_row = function (candy) {
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
};


// ARE YA WINNNING SON

//Connect4.is_winning_for_player
candycrush.is_matched_for_candy = function (candy, grid) {
    return (
        horizontal_match_of_three(candy, grid) ||
        vertical_match_of_three(candy, grid)
    );
};

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

// cascade

// After matches have been removed (cells set to null)
const cascadeGrid = (grid) =>
  R.pipe(
    R.transpose, // Work column by column
    R.map((col) => {
      const nonNulls = R.filter(R.complement(R.isNil), col);
      const missing = R.repeat(null, col.length - nonNulls.length);
      return R.concat(missing, nonNulls); // Push nulls to top
    }),
    R.transpose
  )(grid);

// Fill in new random candies where nulls remain
/* candycrush.fillNewCandies = function (grid, maxCandy) {
  return R.map(
    R.map(cell => cell === null ? R.random(1, maxCandy) : cell),
    grid
  );
}; */

candycrush.fillNewCandies = function (grid, maxCandy) {
  return R.map(
    R.map(cell => cell === null ? 1 : cell),
    grid
  );
};

candycrush.matchPositions = function (grid) {
  const h = horizontal_match_positions(grid);
  const v = vertical_match_positions(grid);
  return R.uniqWith(R.equals, R.concat(h, v));
};

candycrush.handleMatchesAndCascade = function (board, grid, candies) {
  const matches = candycrush.matchPositions(grid);
  if (matches.length === 0) return; // No match, no update

  // Step 1: Remove matched positions (set to null)
  const gridWithoutMatches = removeMatchedPositions(grid, matches);

  // Step 2: Cascade (let non-null values fall down)
  const cascadedGrid = cascadeGrid(gridWithoutMatches);

  // Step 3: Fill with new candies
  const refilledGrid = candycrush.fillNewCandies(cascadedGrid, Object.keys(candies).length);

  // Step 4: Update the DOM to reflect the new grid
  candycrush.updateBoardVisuals(board, refilledGrid, candies);

  // Step 5: Sync the original grid
  grid.splice(0, grid.length, ...refilledGrid);
};

/* 
const removeMatches = (grid, matches) => {
  // Convert list of [row, col] into a Set of string keys for fast lookup
  const matchSet = new Set(matches.map(([r, c]) => `${r},${c}`));

  return R.addIndex(R.map)((row, rowIndex) =>
    R.addIndex(R.map)((cell, colIndex) =>
      matchSet.has(`${rowIndex},${colIndex}`) ? null : cell
    )(row)
  )(grid);
}; */


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

