/*
File: scrab.js
GUI Assignment: Scrabble -- Single line version
James Bord, UMass Lowell Computer Science, james_bord@student.uml.edu
Copyright (c) 2026 by Bord. All rights reserved. May be freely copied or
excerpted for educational purposes with credit to the author.
updated by JB on June 29, 2026
*/


// Global variables, since JS doesn't give you statics
// JSON letter table
var letterTable;

// element being dragged by the mouse
var dragged = null;

// boardstate for dynamic score, placement verification and restoration after the reset tile buttons
var boardstate   = {
    board: null,
    hand: null,
    mult: 1,
    add: 0,
    lastX: null
};

// scores for 4 players. Only P1 is used at the moment.
var scores = [0, 0, 0, 0];

// current player counter. Not used.
var current_player = 0;

// saved empty board state
var rowHTML;

// Equiv. of a MAIN function
$(document).ready(async function() {
    // call the setup function 
    setup();

    // EVENT HANDLERS

    // start drag
    $(document).on("mousedown", function (e) {
        const el = document.elementFromPoint(e.clientX, e.clientY);

        if(!el.id.includes("hand-tile")) return;

        dragged = el;
        $(el).addClass("mousebound");
        $(dragged).css({
            left: (e.pageX - 32) + "px",
            top: (e.pageY - 16) + "px"
        });
    });

    // move
    $(document).on("mousemove", function (e) {
        if (!dragged) return;
        $(dragged).css({
            left: (e.pageX - 32) + "px",
            top: (e.pageY - 16) + "px"
        });
    });

    // end drag
    $(document).on("mouseup", function (e) {
        attemptPlace(e.clientX, e.clientY);
    });

    // button actions
    $("#reset").on("click", function() { restoreBoardState(0) });
    $("#redeal").on("click", function() { draw7(0) });
    $("#submit").on("click", function() { submitWord(0) });
    $("#reset-game").on("click", function() { setup() });
});

// load the board, place special squares, set up a fresh letter table, clear scores, and draw the first hand. 
async function setup() {
    $("#board").html("");

    for(let i = 0; i < 15; i++) {
        $("#board").append(`<tr id="board-row-${i}" class="board-row"></tr>`);  
        for (let j = 0; j < 15; j++) {
            $(`#board-row-${i}`).append(`<td id=board-square-${j}-${i} class="board-square"></td>`);
        }
    }

    // Load the json for all the special tiles
    const specials = await loadJSON("data/special-square.json");

    // Set all the appropriate tiles to specials
    specials.dws.forEach(element => {
        $(`#board-square-${element[0]}-${element[1]}`).addClass("board-dws");
    });
    specials.tws.forEach(element => {
        $(`#board-square-${element[0]}-${element[1]}`).addClass("board-tws");
    });
    specials.dls.forEach(element => {
        $(`#board-square-${element[0]}-${element[1]}`).addClass("board-dls");
    });
    specials.tls.forEach(element => {
        $(`#board-square-${element[0]}-${element[1]}`).addClass("board-tls");
    });
    specials.star.forEach(element => {
        $(`#board-square-${element[0]}-${element[1]}`).addClass("board-star");
    });

    // save the chosen row's empty form
    rowHTML = $("#board-row-7").html();

    // load the letter JSON and wait to avoid desync
    letterTable = await loadJSON("data/pieces.json");
    draw7(0);

    scores = [0, 0, 0, 0];
    $("#score-container").html("0");
    captureBoardState(0);
}

// await the loading of a JSON file
async function loadJSON(json_file) {
    const response = await fetch(json_file);
    const data = await response.json();

    return data;
}

// put back and draw/redraw every tile in a player's hand
function draw7 (hand_index) {
    $(`#hand-${hand_index} tr:first`).children().each(function() {
        putBack(this);
        draw1(this);
    });
    boardstate.hand = $(`#hand-${hand_index}`).html();
}

// Draw back up to 7 tiles
function drawUp(hand_index) {
    $(`#hand-${hand_index} tr:first`).children().each(function() {
        draw1(this);
    });
}

// put one tile back in the "bag". Ignores empty cells.
function putBack(cell) {
    if($(cell).hasClass("hand-none")) return;

    const letter = getLetter(cell);
    letterTable.pieces.forEach(row => {
        if(row.letter == letter) {
            row.amount++;
            letterTable.total++;
        }
    });
    $(cell).removeClass();
    $(cell).addClass("hand-none");
}

// Replace the passed in tile slot with a new tile from the "bag"
// Requires an empty slot to be passed in
function draw1 (cell) {
    if(!$(cell).hasClass("hand-none")) return;
    if(letterTable.pieces.length <= 0) return;

    $(cell).removeClass("hand-none");

    let i = randint(0, letterTable.total - 1);
    var j;
    for(j = 0; j < letterTable.pieces.length - 1; j++) {
        i -= letterTable.pieces[j].amount;
        if(i < 0) {
            break;
        }
    }

    $(cell).addClass(`letter-${letterTable.pieces[j].letter}`);
    letterTable.pieces[j].amount--;
    letterTable.total--;
}

// I needed random integers.
function randint(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Get the class from an object that containes the word letter
function getLetterClass(sq) {
    return $(sq).attr("class")
            .split(" ")
            .find(c => c.includes("letter"));
}

// Get the last character of the letter class, which if you saw the CSS is 
// always a single character and matches what that letter is in the JSON
function getLetter(sq) {
    return getLetterClass(sq).slice(-1);
}

// save the board state for later restoration
function captureBoardState(index) {
    boardstate = {
        board: $("#board").html(),
        hand: $(`#hand-${index}`).html(),
        mult: 1,
        add: 0,
        lastX: null
    };
}

// restore a saved board state
function restoreBoardState(index) {
    $("#board").html(boardstate.board);
    $(`#hand-${index}`).html(boardstate.hand);
    boardstate.mult = 1;
    boardstate.add = 0;
    boardstate.lastX = null;
    $("#score-container").html(String(scores[0]));
}

// attempt to place a tile to the board. this is probably the primary gameplay function
function attemptPlace(x, y) {
    // backup dragged, because i'm too lazy to remember to delete it at every return from this function
    var drag_backup = dragged;

    // exit if there is no element dragged. If there is one undrag it
    if (dragged) {
        $(dragged).removeClass("mousebound");
        dragged = null;
    } else {
        return;
    }

    // Get a reference to what's under the mouse
    const el = document.elementFromPoint(x, y);

    // If it's not a board square under the mouse return from the function 
    // as we can't place the tile
    if(!$(el).hasClass("board-square")) return;

    // get the x coordinate index from the board
    x = getBoardX(el);

    // if there is no previous placed tile set the x index of this tile to 
    // the minimum and maximum placed
    if(boardstate.lastX == null) {
        boardstate.lastX = [x, x];
    }

    // Check to see if the tile is being place within 1 
    // square of the range of the minimum and maximum.
    // This check passes on the null case above.
    if(x < (boardstate.lastX[0] - 1)) return;
    if(x > (boardstate.lastX[1] + 1)) return;

    // get the letter class, letter and value for later.
    const letterClass = getLetterClass(drag_backup);
    const letter = getLetter(drag_backup);
    const value = getLetterValue(letter);

    // double a word on double word
    if($(el).hasClass("board-dws") || $(el).hasClass("board-star")) {
        boardstate.mult *= 2;
    }

    // triple a word on triple word
    if($(el).hasClass("board-tws")) {
        boardstate.mult *= 3;
    }

    // if the letter is doubled add the value an additional time
    if($(el).hasClass("board-dls")) {
        boardstate.add += value
    }

    // if the letter it tripled add the value two additional times
    if($(el).hasClass("board-tls")) {
        boardstate.add += 2 * value
    }

    // add the value of the letter as per normal. 
    boardstate.add += value;

    // remove the classes from the board square and replace them with the appropriate letter classes
    $(el).removeClass();
    $(el).addClass(letterClass);
    $(el).addClass("board-letter");

    // clear the dragged tile of all letter class properties.
    $(drag_backup).removeClass();
    $(drag_backup).addClass("hand-none");

    // Update the minimum and maximum x values played this turn
    if(x < boardstate.lastX[0]) boardstate.lastX[0] = x;
    if(x > boardstate.lastX[1]) boardstate.lastX[1] = x;

    // Update the score display real time
    $("#score-container").html(String(
        scores[0] + (boardstate.add * boardstate.mult)
    ));
}

// lookup the score value of a letter form the JSON table
function getLetterValue(chr) {
    let value = 0;
    letterTable.pieces.forEach(row => {
        if(row.letter == chr) {
            value = row.value;
        }
    });
    return value;
}  

// update the score, update the score display, draw back to 7 tiles, catpure the board state, empty the board
function submitWord(index) {
    scores[index] += (
        boardstate.add * boardstate.mult
    );
    $("#score-container").html(String(scores[index]));

    drawUp(index);
    $("#board-row-7").html(rowHTML);
    captureBoardState(index);
}

// grab the x index from the ID of the board square. 
function getBoardX(sq) {
    const parts = sq.id.split("-");
    return Number(parts[2]);
}
