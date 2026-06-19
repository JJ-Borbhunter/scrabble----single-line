
var letterTable;
var dragged = null;
var boardstate;
var scores = [0, 0, 0, 0];
var current_player = 0;
var rowHTML;

// Equiv. of a MAIN function
$(document).ready(async function() {
    setup();

    // start drag
    $(document).on("mousedown", function (e) {
        const el = document.elementFromPoint(e.clientX, e.clientY);

        if(!el.id.includes("hand-tile")) return;

        dragged = el;
        $(el).addClass("mousebound");
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

    $("#reset").on("click", function() { restoreBoardState(0) });
    $("#redeal").on("click", function() { draw7(0) });
    $("#submit").on("click", function() { submitWord(0) });
    $("#reset-game").on("click", function() { setup() });
});

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

    rowHTML = $("#board-row-7").html();

    letterTable = await loadJSON("data/pieces.json");
    draw7(0);

    scores = [0, 0, 0, 0];
    $("#score-container").html("0");
    captureBoardState(0);
}

async function loadJSON(json_file) {
    const response = await fetch(json_file);
    const data = await response.json();

    console.log(data);

    return data;
}

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

// put one tile back in the "bag"
function putBack(cell) {
    console.log(cell);
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
function draw1 (cell) {
    if(!$(cell).hasClass("hand-none")) return;

    $(cell).removeClass("hand-none");

    let i = randint(0, letterTable.total - 1);
            console.log(i);
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

function getLetterClass(sq) {
    return $(sq).attr("class")
            .split(" ")
            .find(c => c.includes("letter"));
}

function getLetter(sq) {
    return getLetterClass(sq).slice(-1);
}

function captureBoardState(index) {
    boardstate = {
        board: $("#board").html(),
        hand: $(`#hand-${index}`).html(),
        mult: 1,
        add: 0,
        lastX: null
    };
}

function restoreBoardState(index) {
    $("#board").html(boardstate.board);
    $(`#hand-${index}`).html(boardstate.hand);
    boardstate.mult = 1;
    boardstate.add = 0;
    boardstate.lastX = null;
    $("#score-container").html(String(scores[0]));
}

function attemptPlace(x, y) {
    var drag_backup = dragged;
    if (dragged) {
        $(dragged).removeClass("mousebound");
        dragged = null;
    } else {
        return;
    }

    const el = document.elementFromPoint(x, y);
    if(!$(el).hasClass("board-square")) return;

    x = getBoardX(el);
    console.log(boardstate.lastX);
    if(boardstate.lastX == null) {
        boardstate.lastX = [x, x];
    }

    if(x < (boardstate.lastX[0] - 1)) return;
    if(x > (boardstate.lastX[1] + 1)) return;

    const letterClass = getLetterClass(drag_backup);
    const letter = getLetter(drag_backup);
    const value = getLetterValue(letter);

    if($(el).hasClass("board-dws")) {
        boardstate.mult *= 2;
    }
    if($(el).hasClass("board-tws")) {
        boardstate.mult *= 3;
    }
    if($(el).hasClass("board-dls")) {
        boardstate.add += value
    }
    if($(el).hasClass("board-tls")) {
        boardstate.add += 2 * value
    }

    boardstate.add += value;

    $(el).removeClass();
    $(el).addClass(letterClass);
    $(el).addClass("board-letter");
    $(drag_backup).removeClass();
    $(drag_backup).addClass("hand-none");

    if(x < boardstate.lastX[0]) boardstate.lastX[0] = x;
    if(x > boardstate.lastX[1]) boardstate.lastX[1] = x;

    $("#score-container").html(String(
        scores[0] + (boardstate.add * boardstate.mult)
    ));
}

function getLetterValue(chr) {
    let value = 0;
    letterTable.pieces.forEach(row => {
        if(row.letter == chr) {
            value = row.value;
        }
    });
    return value;
}  

function submitWord(index) {
    scores[index] += (
        boardstate.add * boardstate.mult
    );
    $("#score-container").html(String(scores[index]));

    drawUp(index);
    $("#board-row-7").html(rowHTML);
    captureBoardState(index);
}

function getBoardX(sq) {
    const parts = sq.id.split("-");
    return Number(parts[2]);
}
