let canvas;
let ctx;
let level;
let truck;
let orders;
let clouds;
let currentOrder;
let hoverCloud;
let activeCloud;
let mousePos = {x: 0, y: 0};
const CLOUDW = 60;
const CLOUDH = 40;
let holdShape;
let money = 0;
let time = 0;
let maxTime = 5000;
const GAME = "GAME";
const ENDSCREEN = "ENDSCREEN";
const MENU = "MENU";
const TUTORIAL = "TUTORIAL";
let gameState = GAME;
let activePath;
let levelNumber = 0;
let scores = [0, 0, 0];
let stars = [[1, 350, 400, 530, 600], [900, 1100, 1400, 1600, 1700], [1800, 2200, 2500, 3000, 4000]];
let audio = {};
let muted = false;
let currencySymbols = ["Kč", "₹", "$", "$"];
let currencyWords = ["Czech crowns", "Indian rupees", "US dollars", "US dollars"];


const LEVEL = {
	nodes: [],
	draw: function() {
		roundedRect(200 - this.name.length * 12, 5, this.name.length * 25, 60, 10);
		ctx.fillStyle = "blue";
		ctx.fill();
		ctx.strokeStyle = "white";
		ctx.lineWidth = 5;
		ctx.stroke();
		ctx.font = "36px Arial";
		ctx.fillStyle = "white";
		ctx.fillText(this.name, 200, 40);
		for (let nn in this.nodes) {
			var n = this.nodes[nn];
			for (var nextNode of n.neighbors) {
				ctx.beginPath();
				ctx.moveTo(n.x, n.y);
				ctx.lineTo(nextNode.x, nextNode.y);
				ctx.lineWidth = 3;
				ctx.strokeStyle = "black";
				ctx.stroke();
				ctx.fillStyle = "white";
				let x = n.x + (nextNode.x - n.x)*.5;
				let y = n.y + (nextNode.y - n.y)*.5;
			}
		}
		for (var n of this.nodes) {
			ctx.beginPath();
			ctx.arc(n.x, n.y, 8, 0, Math.PI * 2);
			ctx.fillStyle = "brown";
			ctx.fill();
			ctx.strokeStyle = "black";
			ctx.lineWidth = 2;
			ctx.stroke();
			let t = n.name;
			ctx.beginPath();
			ctx.rect(n.x - t.length * 3 - 5, n.y + 12, t.length * 6 + 10, 12);
			ctx.fillStyle = "white";
			ctx.fill();
			ctx.stroke();
			ctx.textAlign = "center";
			ctx.font = "12px Arial";
			ctx.fillStyle = "black";
			ctx.fillText(t, n.x, n.y + 22);
		}
	}
}

function main() {
	ajax.enter();
	canvas = $("#game-canvas")[0];
	ctx = canvas.getContext("2d");
	for (var i = 0; i < 7; ++i) {
		var a = new Audio();
		a.src = "sounds/coin" + i + ".wav";
		audio["coin" + i] = a;
	}
	coinImg = new Image();
	coinImg.src = "graphics/coin.png";
	for (var name of ["engine"]) {
		var a = new Audio();
		a.src = "sounds/" + name + ".wav";
		audio[name] = a;
	}
	audio.engine.volume = 0;
	
	
	$("#game-canvas").mousemove (function(e) {
		mousePos.x = e.offsetX;
		mousePos.y = e.offsetY;
	});
	$("#game-canvas").contextmenu (rotateHoldShape);
	$("#game-canvas").click(handleClick);
	$("body").keydown(handleKey);
	var s = JSON.parse(localStorage.getItem("ld42_scores"));
	if (s) {
		scores = s;
		//makeMenu();
	}
	else {
		gameState = TUTORIAL;
	}
	gameState = TUTORIAL;
	restart(3);
	update();
}

function restart(lev) {
	if (!lev || isUnlocked(lev)) {
		coins = [];
		gameState = GAME;
		if (lev === 3) {
			gameState = TUTORIAL;
		}
		if (lev !== undefined)
			levelNumber = lev;
		$("#buttons, .score-table, #name-input").remove();
		level = Object.create(LEVEL);
		level.nodes = LEVELS[levelNumber].nodes;
		level.cargo = LEVELS[levelNumber].cargo;
		level.shapes = LEVELS[levelNumber].shapes;
		level.name = LEVELS[levelNumber].name;
		maxTime = LEVELS[levelNumber].time;
		makeLevel(level);
		truck = Object.create(TRUCK);
		truck.currentTown = level.nodes[0];
		truck.cargo.restart();
		money = 0.00001;
		time = 0;
		orders = [{value: 0, color: "black"}];
		clouds = [];
		if (lev === 3) {
			makeTutorial();
		}
		else {
			newRandomOrder();
			newRandomOrder();
			newRandomOrder();
		}	
	}
}

function makeLevel(level) {
	var del = Delaunator.from(level.nodes.map(function(a) {return [a.x, a.y]}));
	var tri = del.triangles;
	var n = level.nodes;
	for (var node of n) {
		node.neighbors = [];
	}
	for (var t = 0; t < tri.length; t += 3) {
		n[tri[t    ]].neighbors.push(n[tri[t+1]]);
		n[tri[t + 1]].neighbors.push(n[tri[t+2]]);
		n[tri[t + 2]].neighbors.push(n[tri[t  ]]);
		n[tri[t    ]].neighbors.push(n[tri[t+2]]);
		n[tri[t + 1]].neighbors.push(n[tri[t  ]]);
		n[tri[t + 2]].neighbors.push(n[tri[t+1]]);
	}
	for (var node of n) {
		node.neighbors = node.neighbors.filter(function(value, index, self) {
			return self.indexOf(value) === index;
		})
	}
}

function isFree(x, y, shape) {

	var c = truck.cargo;
	var b = (shape.length - 1) / 2;
	for (var i = -b; i <= b; ++i) {
		for (var j = -b; j <= b; ++j) {
			if (shape[i + b][j + b] && (!c.grid[i + y] || c.grid[i + y][j + x] !== 0)) {
				return false;
			}
		}
	}
	return true;
}


function updateMouse() {
	hoverCloud = undefined;
	var newHover = clouds.filter(function(a) {return a.x < mousePos.x && a.x > mousePos.x - CLOUDW && a.y < mousePos.y && a.y > mousePos.y - CLOUDH && a.active})[0];
	hoverCloud = newHover;
	if (hoverCloud) {
		activePath = shortestPath(truck.calcTown(), (hoverCloud.pickUp ? hoverCloud.parentOrder.source : hoverCloud.parentOrder.destination));
		return;
	}
	else {
		activePath = undefined;
	}
	var t;
	if (t = level.nodes.filter(function(a) {return Math.distance(a, mousePos) < 30})[0]) {
		activePath = shortestPath(truck.calcTown(), t);
	}
	var c = truck.cargo;
	for (var i = 0; i < c.grid.length; ++i) {
		for (var j = 0; j < c.grid[0].length; ++j) {
			if (c.grid[i][j] === 0 && holdShape && 
				mousePos.x >= c.x + c.tileW * j && 
				mousePos.x <= c.x + c.tileW * (j + 1) &&
				mousePos.y >= c.y + c.tileW * i && 
				mousePos.y <= c.y + c.tileW * (i + 1)
			) {
				snapHold(j, i);
				return;
			}
		}
	}
	snapHold();
}

function snapHold(x, y) {
	if (holdShape) {
		if (x === undefined) {
			holdShape.x = holdShape.y = holdShape.available = undefined;
		}
		else {
			var c = truck.cargo;
			holdShape.x = c.x + (x + .5)*c.tileW;
			holdShape.y = c.y + (y + .5)*c.tileW;
			holdShape.available = false;
			if (isFree(x, y, holdShape.shape)) {
				holdShape.available = true;
				holdShape.lockX = x - (holdShape.shape.length - 1) / 2;
				holdShape.lockY = y - (holdShape.shape[0].length - 1) / 2;
			}
		}
	}
}


function handleClick(e) {
	if (gameState === ENDSCREEN) {
		makeMenu();
		return;
	}
	if (activeCloud && activeCloud === hoverCloud) {
		activeCloud = undefined;
		holdShape = undefined;
	}
	else if (hoverCloud && hoverCloud.active) {
		holdShape = undefined;
		if (hoverCloud.pickUp) {
			activeCloud = hoverCloud;
			if (activeCloud.pickUp) {
				holdShape = {};
				Object.assign(holdShape, activeCloud.parentOrder.shape);
			}
		}
		else {
			activeCloud = hoverCloud;
			truck.deliver(orders.indexOf(hoverCloud.parentOrder));
		}
	}
	else if (activePath) {
		truck.addToQueue(null, activePath[activePath.length - 1]);
	}
	else if (holdShape.available && !activeCloud.parentOrder.loaded) {
		truck.place(holdShape);
	}
}

function handleKey(e) {
	console.log(e);
	if (e.keyCode === 27 && gameState !== MENU) {
		makeMenu();
	}
}

function rotateHoldShape(e) {
	e.preventDefault();
	var newShape = [];
	for (var i = 0; i < holdShape.shape.length; ++i) {
		newShape.push([]);
		for (var j = 0; j < holdShape.shape[0].length; ++j) {
			newShape[i][holdShape.shape.length-1-j] = holdShape.shape[j][i];
		}
	}
	holdShape.shape = newShape;
}

function randTown() {
	return level.nodes[Math.floor(Math.random() * level.nodes.length)];
}

function drawShape(x, y, shape, tilew = 20, color = "red") {
	ctx.save();
	ctx.translate(x - tilew * shape[0].length * .5, y - tilew * shape.length * .5);
	for (var r = 0; r < shape.length; ++r) {
		var row = shape[r];
		for (var t = 0; t < row.length; ++t) {
			var tile = row[t];
			if (tile) {
				ctx.beginPath();
				ctx.rect(t * tilew, r * tilew, tilew, tilew);
				ctx.fillStyle = color;
				ctx.fill();
				ctx.strokeStyle = "black";
				ctx.lineWidth = tilew * .1;
				ctx.stroke();
			}
		}
	}
	ctx.restore();
}

function drawEndScreen() {
	ctx.fillStyle = "white";
	ctx.beginPath();
	ctx.rect(canvas.width / 2 - 250, 200, 500, 180);
	ctx.fill();
	ctx.strokeStyle = "black";
	ctx.lineWidth = 8;
	ctx.stroke();
	ctx.textAlign = "center";
	ctx.font = "20px Arial";
	ctx.fillStyle = "black";
	ctx.fillText("You ran out of fuel", canvas.width / 2, 230);
	ctx.fillText("You earned " + Math.round(money) + " " + currencyWords[levelNumber], canvas.width / 2, 250);
	ctx.fillText("Your performance rating:", canvas.width / 2, 270);
	ctx.fillText("Click anywhere to return to menu", canvas.width / 2, 370);
	var star = new Image();
	star.src = "graphics/star.png";
	var nope = new Image();
	nope.src = "graphics/star-gray.png";
	for (var i = 0; i < 5; ++i) {
		var x = canvas.width / 2 - 120 + i * 60;
		var y = 310;
		var w = 50;
		if (starAmt(levelNumber, money) > i) {
			ctx.drawImage(star, x - w/2, y - w/2, w, w)
		}
		else {
			ctx.drawImage(nope, x - w/2, y - w/2, w, w)
		}
	}
	
}

function makeMenu() {
	if (gameState !== MENU) {
		gameState = MENU;
		holdShape = undefined;
		audio.engine.pause();
		$buttons = $("<div id='buttons'></div>");
		for (var lev = 0; lev < 3; ++lev) {
			$buttWrap = $("<div class='button-wrap'></div>");
			if (!isUnlocked(lev)) {
				$buttWrap.append("<div class='lock'><span>" + lev * 3 + "x</span></div>");
			}
			$buttWrap.append("<div class='truck-image truck-" + lev + "'></div>");
			$butt = $("<button class='menu" + (isUnlocked(lev) ? "" : " locked") + "' id='level-" + lev + "' onclick=\"restart(" + lev + ")\">" + ["Czech Republic", "India", "America"][lev] + "</button>");
			$stars = $("<div class='stars'></div>");
			for (var s = 0; s < 5; ++s) {
				$stars.append("<div class='star" + (starAmt(lev) > s ? " done" : " nope") + "'></div>");
			}
			$top = $("<span class='top'>High score: " + Math.round(scores[lev]) + "</span>");
			$buttWrap.append($butt).append($stars).append($top);
			
			$buttons.append($buttWrap);
		}
		$("body").append($buttons);
		$("body").append($("<input oninput='rename()' placeholder='Your name' id='name-input' type='text' value='" + ((userName && userName.substr(0, 4)) === "usr_" ? "" : userName) + "'></input>"));
		makeHighScores();
	}
}
function rename() {
	ajax.rename($("#name-input").val());
}

function isUnlocked(lev) {
	if (lev === 3)
		return true;
	var stars = 0;
	for (var i = 0; i < lev; ++i) {
		stars += starAmt(i);
	}
	if (stars >= lev * 3) {
		return true;
	}
	return false;
}

function starAmt(lev, score) {
	return stars[lev].filter(function(a) {return a < (this.score || scores[lev])}, {score: score}).length;
}

function update() {
	requestAnimationFrame(update);
	if (gameState === GAME || gameState === TUTORIAL) {
		
		truck.update();
	}
	for (var coin of coins) {
		coin.update();
	}
	updateMouse();
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	if (gameState !== MENU) {
		draw();
	}
}

function draw() {
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	ctx.beginPath();
	ctx.rect(570, 300, 1000, 1000);
	ctx.fillStyle = "#dddddd";
	ctx.fill();
	ctx.strokeStyle = "black";
	ctx.stroke();
	ctx.fillStyle = "black";
	ctx.font = "20px Arial";
	ctx.fillText("Cargo", 700, 320);
	level.draw();
	if (activePath) {
		for (var i = 0; i < activePath.length - 1; ++i) {
			ctx.beginPath()
			ctx.moveTo(activePath[i].x, activePath[i].y);
			ctx.lineTo(activePath[i+1].x, activePath[i+1].y);
			ctx.strokeStyle = "red";
			ctx.stroke();
		}
	}
	drawOrders();
	
	truck.draw();
	
	if (holdShape) {
		if (!holdShape.available) {
			ctx.globalAlpha = .5;
		}
		drawShape(holdShape.x || mousePos.x, holdShape.y || mousePos.y, holdShape.shape, truck.cargo.tileW, activeCloud.parentOrder.color);
		ctx.globalAlpha = 1;
	}
	
	
	
	
	//ctx.fillText("Time left: " + (maxTime - time), 500, 50);
	
	// fuel gauge
	ctx.save();
	ctx.beginPath();
	ctx.translate(700, 590);
	ctx.arc(0, 0, 50, -Math.PI * (1.33), Math.PI * .33);
	ctx.fillStyle = "#111111";
	ctx.fill();
	
	var img = new Image();
	img.src = "graphics/fuel.png";
	ctx.drawImage(img, -10, -30, 20, 20);
	var arcSize = Math.PI * .8;
	ctx.rotate(-arcSize * .5);
	ctx.beginPath();
	ctx.arc(0, 0, 45, -Math.PI * .5, arcSize - Math.PI * .5);
	ctx.lineWidth = 2;
	ctx.strokeStyle = "white";
	ctx.stroke();
	var steps = 32;
	for (var r = 0; r <= steps; r += 1) {
		ctx.beginPath();
		var e = evenness(r);
		ctx.rect(-1, -50, 2, 4 * e);
		ctx.fillStyle = "white";
		ctx.fill();
		ctx.rotate(arcSize * 1/steps);
	}
	ctx.rotate(-arcSize * (time/maxTime) - arcSize * 1/steps);
	ctx.beginPath();
	ctx.moveTo(2, 0);
	ctx.lineTo(1, -40);
	ctx.lineTo(-1, -40);
	ctx.lineTo(-2, 0);
	ctx.fillStyle = "red";
	ctx.fill();
	
	ctx.beginPath();
	ctx.arc(0, 0, 8, 0, Math.PI * 2);
	ctx.fillStyle = "#333333";
	ctx.fill();
	ctx.restore();
	
	// 7 segments
	ctx.fillStyle = "black";
	ctx.font = "40px Arial";
	var numbers = [
		/*
		 0
		1 2
		 3
		4 5
		 6
		*/		
		[0, 1, 2, 4, 5, 6],
		[2, 5],
		[0, 2, 3, 4, 6],
		[0, 2, 3, 5, 6], 
		[1, 3, 2, 5],
		[0, 1, 3, 5, 6],
		[0, 1, 3, 4, 5, 6],
		[0, 2, 5],
		[0, 1, 2, 3, 4, 5, 6],
		[0, 1, 2, 3, 5, 6]
	];
	var segmentSize = 18;
	
	ctx.translate(620, 465);
	ctx.fillStyle = "black";
	ctx.fillRect(0, 0, 170, 70);
	ctx.fillText(currencySymbols[levelNumber], -28, 40)
	for (var order = 0; order < 6; ++order) {
		var n = Math.floor(Math.round(money) / (Math.pow(10, order))) % 10;
		ctx.setTransform(1, 0, 0, 1, 0, 0);
		ctx.translate(760 - order * segmentSize * 1.5, 475);
		//ctx.fillText(n, 300 - order * 20, 50);
		for (var s = 0; s < 7; ++s) {
			ctx.save();
			if (numbers[n].indexOf(s) > -1 && ((Math.pow(10, order) < money) || (order === 0 && Math.round(money) === 0))) {
				ctx.strokeStyle = "red";
				ctx.fillStyle = "red";
			}
			else {
				ctx.strokeStyle = ctx.fillStyle = "#330000";
			}
			if (s === 0 || s === 1) {
				
			}
			else if ([2, 3, 5].indexOf(s) > -1) {
				ctx.translate(segmentSize, segmentSize);
			}
			else {
				ctx.translate(0, segmentSize * 2);
			}
			if ([1, 5].indexOf(s) > -1) {
				ctx.rotate(Math.PI * .5);
			}
			else if ([2, 4].indexOf(s) > -1) {
				ctx.rotate(-Math.PI * .5);
			}
			else if (s === 3) {
				ctx.rotate(Math.PI);
			}
			segmentW = .2
			ctx.beginPath();
			ctx.moveTo(segmentSize * segmentW * .5, 0);
			ctx.lineTo(segmentSize * segmentW, segmentSize * segmentW * .5);
			ctx.lineTo(segmentSize * (1 - segmentW), segmentSize * segmentW * .5);
			ctx.lineTo(segmentSize * (1 - segmentW * .5), 0);
			ctx.lineTo(segmentSize * (1 - segmentW), -segmentSize * segmentW * .5);
			ctx.lineTo(segmentSize * segmentW, -segmentSize * segmentW * .5);
			ctx.lineWidth = 5;
			ctx.fill();
			//ctx.stroke();
			ctx.restore();
		}
	}
	ctx.setTransform(1, 0, 0, 1, 0, 0);
	
	for (var coin of coins) {
		coin.draw();
	}
	if (gameState === ENDSCREEN) {
		drawEndScreen();
	}
	if (gameState === TUTORIAL) {
		var tImg = new Image();
		tImg.src = "graphics/tutorial.png";
		ctx.drawImage(tImg, 0, 0, 800, 600);
	}
}

function evenness(n) {
	if (n === 0) 
		return 5;
	var e = -1;
	do {
		n /= 2;
		e += 1;
	} while (n % 1 === 0);
	return e;
}

function gameOver() {
	gameState = ENDSCREEN;
}

function travelDistance(town1, town2) {
	return pathLength(shortestPath(town1, town2));
}

function pathLength(path) {
	if (!path) {
		return 10000000;
	}
	var distance = 0;
	for (var i = 0; i < path.length - 1; ++i) {
		distance += Math.distance(path[i], path[i+1]);
	}
	return distance;
}

function shortestPath(p1, p2) {
	var paths = [];
	paths[level.nodes.indexOf(p1)] = [p1];
	var bfsQueue = [p1];
	var queueIndex = 0;
	while (queueIndex < bfsQueue.length) {
		var currPoint = bfsQueue[queueIndex];
		var currId = level.nodes.indexOf(currPoint);
		for (var point of currPoint.neighbors) {
			var nextId = level.nodes.indexOf(point);
			if (bfsQueue.indexOf(point) === -1) {
				bfsQueue.push(point);
			}
			if (pathLength(paths[nextId]) > pathLength(paths[currId].concat([point]))) {
				paths[nextId] = paths[currId].concat([point]);
			}
		}
		++queueIndex;
	}
	return paths[level.nodes.indexOf(p2)];
}

Math.distance = function(p1, p2) {
	return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
}




function getRandomColor(numOfSteps, step) {
	// This function generates vibrant, "evenly spaced" colours (i.e. no clustering). This is ideal for creating easily distinguishable vibrant markers in Google Maps and other apps.
    // Adam Cole, 2011-Sept-14
    // HSV to RBG adapted from: http://mjijackson.com/2008/02/rgb-to-hsl-and-rgb-to-hsv-color-model-conversion-algorithms-in-javascript
	//https://stackoverflow.com/a/7419630/5292374
    var r, g, b;
    var h = step / numOfSteps;
    var i = ~~(h * 6);
    var f = h * 6 - i;
    var q = 1 - f;
    switch(i % 6){
        case 0: r = 1; g = f; b = 0; break;
        case 1: r = q; g = 1; b = 0; break;
        case 2: r = 0; g = 1; b = f; break;
        case 3: r = 0; g = q; b = 1; break;
        case 4: r = f; g = 0; b = 1; break;
        case 5: r = 1; g = 0; b = q; break;
    }
    var c = "#" + ("00" + (~ ~(r * 255)).toString(16)).slice(-2) + ("00" + (~ ~(g * 255)).toString(16)).slice(-2) + ("00" + (~ ~(b * 255)).toString(16)).slice(-2);
    return (c);
}

function roundedRect(x, y, w, h, radius) {
	ctx.beginPath();
	ctx.moveTo(x + radius, y);
	ctx.arc(x + w - radius * 2, y + radius, radius, - Math.PI * .5, 0);
	ctx.arc(x + w - radius * 2, y + h - radius * 2, radius, 0, Math.PI * 0.5);
	ctx.arc(x + radius, y + h - radius * 2, radius, Math.PI * 0.5, Math.PI);
	ctx.arc(x + radius, y + radius, radius, Math.PI, Math.PI * 1.5);
}
function makeHighScores() {
	ajax.fetchScores().then(function() {
		var left = 85;
		for (var mode = 0; mode < 3 || !isUnlocked(mode); ++mode) {
			var table = makeScoreTable("" + mode);
			table.css("left", left);
			left += 230;
			$("body").append(table);
			
		}
	});
}

function makeScoreTable(mode) {
	if (gameState === MENU || gameState === TUTORIAL) {
		let modeHighscores = highScores.filter(a => a[2] === mode);
		let selfScore = false;
		let table = $("<table id='" + mode + "-table' class='score-table'><tr><th colspan=3>High scores<th></tr></table>");
		for (var r = 0; r < Math.min(10, modeHighscores.length); ++r) {
			let tr = $(
			"<tr class='score-row" + (userName === modeHighscores[r][0] ? " own-score'" : "") + "'>" + 
				"<td class='score-rank'>" + (1 + r) + "</td>" + 
				"<td class='score-name'><div class='score-name-inner'>" + modeHighscores[r][0] + "</div></td>" + 
				"<td class='score-score'>" + modeHighscores[r][1] + "</td>" + 
			"</tr>");
			table.append(tr);
			if (userName === modeHighscores[r][0]) {
				selfScore = true;
			}
		}
		if (!selfScore) {
			var myScore = modeHighscores.filter(a => a[0] === userName)[0];
			if (myScore) {
				table.append($("<tr><th colspan=3>&#x22ee;</th></td>"));
				let tr = $(
				"<tr class='score-row own-score'>" + 
					"<td class='score-rank'>" + (modeHighscores.indexOf(myScore) + 1) + "</td>" + 
					"<td class='score-name'>" + myScore[0] + "</td>" + 
					"<td class='score-score'>" + myScore[1] + "</td>" + 
				"</tr>");
				table.append(tr);
			}
		}
		return table;
	}
}



onload = main;