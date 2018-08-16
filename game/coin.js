const COIN = {
	
	
	update: function() {
		++this.age;
		this.rotation += this.rotSpeed;
		this.speed.y += .08;
		this.pos.x += this.speed.x;
		this.pos.y += this.speed.y;
	},
	draw: function() {
		ctx.globalAlpha = 1 - Math.min(1, Math.max(0, this.age / this.maxAge));
		ctx.save();
		ctx.translate(this.pos.x, this.pos.y);
		ctx.rotate(this.rotation);
		ctx.drawImage(coinImg, - 10, - 10, 20, 20);
		ctx.restore();
		ctx.globalAlpha = 1;
	},
	init: function() {
		this.speed = {x: -.4 + Math.random() * .8, y: - 2 -Math.random()};
		this.age = 0;
		this.maxAge = 0;
		this.rotation = Math.random() * Math.PI * 2;
		this.rotSpeed = -.05 + Math.random() * .1;
		this.maxAge = 50 + Math.random() * 50;
	}
}

let coins = [];