const TRUCK = {
	stepSize: 1,
	nextTown: undefined,
	currentTown: undefined,
	lastTown: undefined,
	cargo: undefined,
	queue: [],
	routeProgress: 0,
	draw: function() {
		ctx.fillStyle = "#aaaaff";
		let x, y;
		if (this.currentTown) {
			x = this.currentTown.x;
			y = this.currentTown.y;
		}
		if (this.onRoad()) {
			let d = Math.distance(this.lastTown, this.nextTown);
			x = this.lastTown.x + (this.routeProgress / d) * (this.nextTown.x - this.lastTown.x);
			y = this.lastTown.y + (this.routeProgress / d) * (this.nextTown.y - this.lastTown.y);
		}
		var img = new Image();
		img.src = "graphics/truck" + levelNumber + ".png";
		ctx.drawImage(img, x - 20, y - 20, 40, 30);
		//ctx.fillRect(x - 20, y - 10, 40, 20);
		
		this.cargo.draw();
	},
	goToTown: function(town) {
		if (this.currentTown === town) {
			this.nextTown = town;
			return this.townArrival();
		}
		if (this.currentTown && !this.onRoad()) {
			this.lastTown = this.currentTown;
			this.nextTown = town;
			if (!muted) {
				audio.engine.currentTime = 0;
				audio.engine.play();
				$(audio.engine).animate({volume: .5}, 300);
			}
			
		}
		else if (this.onRoad()) {
			
		}
	},
	addToQueue: function(cloud, town) {
		var lastTown = this.calcTown();
		var shortPath = shortestPath(lastTown, town);
		this.queue = this.queue.concat(shortPath.map(function(a) {return {town: a, cloud: null}}));
		this.queue[this.queue.length - 1].cloud = cloud;
	},
	calcTown: function() {
		return (this.queue.length === 0 ? this.currentTown || this.nextTown : this.queue[this.queue.length - 1].town);
	},
	onRoad: function() {
		return this.lastTown && this.nextTown;
	},
	step: function() {
		this.routeProgress += this.stepSize;
		time += 1;
		if (time >= maxTime && gameState === GAME) {
			gameOver();
			audio.engine.volume = 0;
			audio.engine.pause();
			ajax.submit();
			scores[levelNumber] = Math.max(scores[levelNumber], money);
			localStorage.setItem("ld42_scores", JSON.stringify(scores));
		}
	},
	place: function(shape) {
		let id = orders.indexOf(activeCloud.parentOrder);
		for (var i = 0; i < shape.shape.length; ++i) {
			for (var j = 0; j < shape.shape[0].length; ++j) {
				if (shape.shape[i][j]) {
					this.cargo.grid[shape.lockY + i][shape.lockX + j] = id;
				}
			}
		}
		this.addToQueue(orders[id].pickUpCloud, orders[id].source);
		orders[id].loaded = true;
		orders[id].pickUpCloud.active = false;
		orders[id].pickUpCloud.relevant = false;
		orders[id].destinationCloud.active = true;
		activeCloud = undefined;
		holdShape = undefined;
	},
	update: function() {
		if (this.onRoad()) {
			for (var i = 0; i < 5; ++i) {
				if (toStop < 0) {
					this.townArrival();
					
				}
				this.step();
				updateOrders();
				var toStop = Math.distance(this.nextTown, this.lastTown) - this.stepSize * this.routeProgress;
				
			}
		}
		else if (this.queue.length > 0) {
			this.goToTown(this.queue[0].town);
		}
	},
	deliver: function(id) {
		for (var i = 0; i < this.cargo.grid.length; ++i) {
			for (var j = 0; j < this.cargo.grid[0].length; ++j) {
				if (this.cargo.grid[i][j] === id) {
					this.cargo.grid[i][j] = 0;
				}
			}
		}
		activeCloud.relevant = false;
		activeCloud.parentOrder.complete = true;
		this.addToQueue(activeCloud, activeCloud.parentOrder.destination);
	},
	townArrival: function() {
		
		this.currentTown = this.nextTown;
		this.nextTown = this.lastTown = undefined;
		if (this.queue[0].cloud) {
			if (this.queue[0].cloud && !this.queue[0].cloud.pickUp) {
				var v = this.queue[0].cloud.parentOrder.value;
				money += v;
				var index = Math.floor((Math.random() - .5) * .2 + Math.sqrt(v) * .3);
				console.log(index);
				if (!muted)
					audio["coin" + index].play();
				for (var i = 0; i <= index; ++i) {
					var c = Object.create(COIN);
					c.init();
					c.pos = {x: this.currentTown.x, y: this.currentTown.y};
					coins.push(c);
					if (orders.filter(function(a) {return !a.complete}).length === 1) {
						makeMenu();
					}
				}
			}
			clouds.splice(clouds.indexOf(this.queue[0].cloud), 1);
		}
		this.queue.splice(0, 1);
		if (this.queue.length === 0) {			
			$(audio.engine).animate({volume: 0}, 300, function() {
				audio.engine.pause();
				audio.engine.volume = 0;
			});
		}
		for (var cloud of clouds)
			cloud.x = undefined;
		this.routeProgress = 0;
	},
	cargo: {
		grid: [],
		tileW: 30,
		x: 600,
		y: 300,
		restart: function() {
			this.grid = level.cargo;
			for (var r in this.grid) {
				this.grid[r] = this.grid[r].map(function(a) {return a > -1 ? 0 : -1});
			}
		},
		draw: function() {
			ctx.fillStyle = "black";
			for (var r = 0; r < this.grid.length; ++r) {
				var row = this.grid[r];
				for (var t = 0; t < row.length; ++t) {
					
					let c = row[t];
					ctx.strokeStyle = "black";
					if (c > 0) {
						ctx.fillStyle = orders[c].color;
					}
					else if (c === 0) {
						ctx.fillStyle = "#888888";
					}
					/*else if (gameState === UPGRADE) {
						ctx.fillStyle = "#aaaaaa";
					}*/
					else {
						ctx.fillStyle = ctx.strokeStyle = "rgba(0, 0, 0, 0)";
					}
					ctx.beginPath();
					ctx.rect(this.x + 1 + t * this.tileW, this.y + 1 + r * this.tileW, this.tileW - 2, this.tileW - 2);
					
					ctx.lineWidth = 1;
					ctx.stroke();
					ctx.fill();
					//drawBlock(this.x + 1 + t * this.tileW, this.y + 1 + r * this.tileW, this.tileW - 2, this.tileW - 2, ctx.fillStyle);
					
				}
			}
		}
	}
}

function drawBlock(x, y, w, h, color) {
	if (color !== "rgba(0, 0, 0, 0)") {
		ctx.beginPath();
		ctx.save();
		ctx.translate(x, y);
		ctx.rect(0, 0, w, h);
		ctx.fillStyle = color;
		ctx.fill();
	
		ctx.strokeStyle = "black";
		ctx.lineWidth = w * .01;
		ctx.stroke();
		
	
	
	
		ctx.restore();
	}
}