var orig = "https://boltkey.cz/tetrans/";
var highScores = {};
var first;
var highScores;
var userName;
var ajax = {
	enter: function(name) {
		/*if (kongregate) {
			var kname = kongregate.services.getUsername();
			var id = kongregate.services.getUserId();
			if (id && name === undefined)
				name = kname
		}*/
		$.ajax({
		url: orig + "php/entry.php" + ((name === undefined) ? "" : "?display=" + name),
		type: "GET",
		crossDomain: true,
		success: function(data){
			console.log(data);
			var a = JSON.parse(data);
			if (a[0]) {
				first = false;
			}
			else {
				first = true;
			}
			$("#usr-text").val(a[1]);
			userName = a[1];
			if (userName.substr(0, 4) !== "usr_") {
				$("#name-input").val(userName);
			}
			ajax.fetchScores();
		}
	})
	},
	rename: function(name) {
		userName = name;
		$.ajax({
		url: orig + "php/rename.php?newname=" + name,
		type: "GET",
		crossDomain: true,
		success: function(data){
			console.log(data);
		}
	})
	},
	submit: function() {
		// Hi. Please, don't try to hack this. You will break the system probably.
		return $.ajax({
		url: orig + "php/submit.php?score=" + money + "&mode=" + levelNumber,
		type: "GET",
		crossDomain: true,
		success: function(data){
			console.log(data);
			
		}
	})
	},
	fetchScores: function() {
		return $.ajax({
		url: orig + "php/fetch_scores.php",
		type: "GET",
		crossDomain: true,
		success: function(data){
			highScores = JSON.parse(data);
			for (var i in highScores) {
				var a = highScores[i].filter(function(a) {return a[0] === userName})[0];
				if (a)
					highScores[i] = a[1];
			}
		}
	})
	}
}