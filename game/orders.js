let lastOrder = 0;

function updateOrders() {
	lastOrder += 1;
	let randFactor = 1/(orders.filter(function(a){return !a.complete})).length * (level.nodes.length/10) * (.001 + lastOrder * 0.0002);
	if (Math.random() < randFactor && gameState === GAME) {
		newRandomOrder();
		lastOrder = 0;
	}
	for (var order of orders) {
		//order.value *= .9995;
	}
}

function newRandomOrder() {
	do {
		var order = {source: randTown(), destination: randTown()};
	} while (order.source === order.destination);
	order.shape = {};
	order.shape = Object.assign(order.shape, SHAPES[level.shapes[Math.floor(Math.random() * level.shapes.length)]]);
	order.value = (10 + travelDistance(order.source, order.destination)) * order.shape.diffic * .08;
	order.color = getRandomColor((orders.length * 3) % 19, 19);
	order.pickUpCloud = {x: undefined, y: undefined, parentOrder: order, pickUp: true, active: true, relevant: true};
	order.destinationCloud = {x: undefined, y: undefined, parentOrder: order, pickUp: false, active: false, relevant: true};
	order.complete = false;
	order.loaded = false;
	clouds.push(order.pickUpCloud);
	clouds.push(order.destinationCloud);
	orders.push(order);
	return order;
}
function makeTutorial() {
	orders.push(newRandomOrder());
	orders.push(newRandomOrder());
}
function drawOrders() {
	for (var cloud of clouds) {
		
		var order = cloud.parentOrder;
		if (cloud.x === undefined) {
			var s = cloud.pickUp ? order.source : order.destination;
			cloud.x = s.x + (cloud.pickUp ? -CLOUDH - 10 : 10);
			cloud.y = s.y - CLOUDH * 2 + clouds.filter(function(a) {
				return this.pickUp === a.pickUp && a.x &&
				(this.pickUp ? this.parentOrder.source === a.parentOrder.source :
				            this.parentOrder.destination === a.parentOrder.destination)}, 
				cloud).length * (CLOUDH + 4);
		}
		ctx.save();
		ctx.translate(cloud.x, cloud.y);
		if (!cloud.relevant) {
			ctx.globalAlpha = .5;
		}
		ctx.beginPath();
		roundedRect(0, 0, CLOUDW, CLOUDH, 8);
		ctx.fillStyle = (
			cloud.active ? 
				(cloud === activeCloud ? 
					"#ffffcc" : 
					(cloud === hoverCloud 
						? (cloud.pickUp ? "#ffffcc" : "#88aa00") 
						: (cloud.pickUp ? "white" : "#99bb11")
					)
				) : 
				((!cloud.pickUp && (
									cloud.parentOrder.pickUpCloud === hoverCloud ||
									cloud.parentOrder.pickUpCloud === activeCloud
									))
					? "#ddff88" : "gray" 
				)
				
				);
		ctx.fill();
		ctx.strokeStyle = "black";
		ctx.lineWidth = 4;
		ctx.stroke();
		ctx.fillStyle = "#ccdd11";
		ctx.font = Math.floor(CLOUDH * .8) + "px Arial";
		ctx.textAlign = "center";
		ctx.fillText(cloud.pickUp ? "?":"!", CLOUDW * .2, CLOUDH * .7);
		drawShape(CLOUDW * .6, CLOUDH * .3, order.shape.shape, CLOUDH * .1, order.color);
		ctx.font = Math.floor(CLOUDH * .3) + "px Arial";
		ctx.fillText(currencySymbols[levelNumber] + Math.round(cloud.parentOrder.value), CLOUDW * .57, CLOUDH * .73);
		ctx.restore();
	}
}