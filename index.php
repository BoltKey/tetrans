<head>
<meta charset="utf-8" />
<title>Shapy Pickup</title>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0">
<link rel="shortcut icon" href="/boltlogo.png">
<script type="text/javascript" src="https://ajax.googleapis.com/ajax/libs/jquery/2.1.3/jquery.min.js"></script>
<script src="https://unpkg.com/delaunator@2.0.0/delaunator.min.js"></script>
<link href="style.css" rel="stylesheet">
<?php 
foreach (glob("game/*.js") as $filename)
{
    echo '<script type="text/javascript" src='.$filename.'></script>
';
} 
?>
</head>
<body>
<canvas id="game-canvas" width=800 height=600></canvas>
<button id='mute' onclick='muted = !muted'>Mute</button>
</body>