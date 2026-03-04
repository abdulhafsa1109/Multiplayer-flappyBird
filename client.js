class Bird {
  constructor() {
    this.x = width / 2;
    this.y = height / 2;
    this.radius = 5;
    this.Vy = 0;
    this.jumpheight = 6;
    this.dead = false;
    this.score = 0;
    this.color = this.randomColor();

    // Load Flappy Bird image
    this.img = new Image();
    this.img.src = 'https://i.imgur.com/OdL0XPt.png';
    this.imgWidth = 40;
    this.imgHeight = 30;
  }

  update() {
    this.y += this.Vy;
    this.Vy += 0.2;
    this.score = this.calculateScore();

    for (let i = 0; i < pipes.length; i++) {
      if (
        this.x > pipes[i].x &&
        this.x < pipes[i].x + pipes[i].Pipewidth &&
        this.y < pipes[i].TopPipeHeight
      ) {
        this.dead = true;
      }

      if (
        this.x > pipes[i].x &&
        this.x < pipes[i].x + pipes[i].Pipewidth &&
        this.y > height - pipes[i].BottomPipeHeight
      ) {
        this.dead = true;
      }
    }

    if (this.dead) {
      socket.emit("dead", username);
    }

    socket.emit("scores", this.score);
  }

  show() {
    let c = document.getElementById("canvas");
    let ctx = c.getContext("2d");
    ctx.drawImage(
      this.img,
      this.x - this.imgWidth / 2,
      this.y - this.imgHeight / 2,
      this.imgWidth,
      this.imgHeight
    );
  }

  jump() {
    this.Vy -= this.jumpheight;
  }

  calculateScore() {
    let mindist = 10000;
    let score = 0;
    for (let i = 0; i < pipes.length; ++i) {
      let d = this.dist(this.x, this.y, pipes[i].x, this.y);
      if ((d < mindist) & (pipes[i].x < width / 2 - pipes[i].Pipewidth)) {
        mindist = d;
        score = i;
      }
    }

    score += 1;
    return score;
  }

  randomColor() {
    return "hsl(" + random(0, 255) + ", 100%, 80%)";
  }

  dist(x1, y1, x2, y2) {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
  }
}

class Pipe {
  constructor(startX, startY) {
    this.x = startX;
    this.BottomPipeHeight = startY;
    this.Pipewidth = 50;
    this.Pipegap = 200;
    this.TopPipeHeight = height - (this.BottomPipeHeight + this.Pipegap);
    this.speed = 5;
  }

  update() {
    this.x -= this.speed;
  }

  show() {
    let c = document.getElementById("canvas");
    let ctx = c.getContext("2d");

    // Bottom pipe
    ctx.fillStyle = "#00FF00";
    ctx.fillRect(this.x, height - this.BottomPipeHeight, this.Pipewidth, this.BottomPipeHeight);

    // Top pipe
    ctx.fillStyle = "#00FF00";
    ctx.fillRect(this.x, 0, this.Pipewidth, this.TopPipeHeight);
  }
}

const socket = io();
let flappy;
let pipes = [];
let height = $("#canvas").height();
let width = $("#canvas").width();
let game = false;
let username;
let interval;
let counterInterval;
let counter = 3;

// Chatroom width
$("#chatroom").css("width", window.innerWidth - 1080);

// UI setup
$("#startFlappyGame").hide();
$("#canvas").hide();
$("#waitingroomtext").hide();
$("#currentgameLeaderboard").hide();
$("#allTimeLeaderboard").hide();
$("#chatroom").hide();
$("#activeUsers").hide();
$("#youdiedtext").hide();

flappy = new Bird();
$("#startFlappyGame").click(startFlappyGame);

$("#SignUp").click(function () {
  let password = $("#password").val();
  username = $("#username").val();

  if (username && password) {
    socket.emit("SignUp", username, password);
  } else {
    alert("Please enter both username and password");
  }
});

$("#login").click(function () {
  let password = $("#password").val();
  username = $("#username").val();

  if (username && password) {
    socket.emit("login", username, password);
  } else {
    alert("Please enter both username and password");
  }
});

function connectGame() {
  $("#authentication").hide();
  $("#canvas").show();
  $("#currentgameLeaderboard").show();
  $("#allTimeLeaderboard").show();
  $("#chatroom").show();
  $("#activeUsers").show();
  $("h1").html("Multiplayer Flappy Bird!");
  $("body").css(
    "background-image",
    $("body").css(
      "background-image",
      //"url('https://cdn.glitch.com/b7eb593f-7abf-4353-97ed-b139d4d95334%2FDownload-Sky-Wallpapers-High-Resolution.jpg?v=1614655474226')"
       "rgb(135, 206, 235)"
    ));
}

function startFlappyGame() {
  socket.emit("userstartedFlappyGame");
}

function draw() {
  let c = document.getElementById("canvas");
  let ctx = c.getContext("2d");
  ctx.fillStyle = "#87CEEB";
  ctx.fillRect(0, 0, width, height);

  if (!flappy.dead) {
    flappy.update();
    flappy.show();

    c.onclick = function () {
      if (game) flappy.jump();
    };

    for (let i = 0; i < pipes.length; i++) {
      pipes[i].show();
      pipes[i].update();
    }

    socket.emit("score", username, flappy.score);
  }

  if (flappy.dead) {
    $("#youdiedtext").show();
  }
}

socket.on("addnewPipe", function (pipeHeight) {
  pipes.push(new Pipe(width, pipeHeight));
});

socket.on("pipes", function (pipeHeights) {
  for (let i = 0; i < pipeHeights.length; i++) {
    pipes[i] = new Pipe(width + i * 300, pipeHeights[i]);
  }
});

socket.on("showscores", function (userscores) {
  let stats = userscores.map(([name, score]) => `${name} ${score}`).join("<li>");
  $("#currentgameLeaderboardscores").html("<li>" + stats + "</li>");

  let list = document.querySelectorAll("#currentgameLeaderboardscores li");
  list.forEach((item, index) => {
    if (userscores[index][2] == "dead") {
      item.style.color = "red";
    }
  });
});

socket.on("gameplay", function (playing) {
  if (playing) {
    $("#waitingroomtext").show();
  } else {
    $("#startFlappyGame").show();
    $("#waitingroomtext").hide();
  }
});

socket.on("startGame", function () {
  counterInterval = setInterval(gameDelay, 900);
  $("#countertext").html("The game will begin in " + counter + " seconds");
  $("#countertext").show();
  $("#startFlappyGame").hide();
  flappy.show();
});

function gameDelay() {
  counter--;
  $("#countertext").html("The game will begin in " + counter + " seconds");
  if (counter == 0) {
    interval = setInterval(draw, 13);
    game = true;
    counter = 3;
    $("#countertext").hide();
    clearInterval(counterInterval);
  }
}

socket.on("everyoneDead", function () {
  reset();
  let c = document.getElementById("canvas");
  let ctx = c.getContext("2d");
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, width, height);
  socket.emit("reset");
});

function reset() {
  flappy = new Bird();
  clearInterval(interval);
  game = false;
  $("#startFlappyGame").show();
  $("#youdiedtext").hide();
}

socket.on("signupfailed", function (username) {
  alert(username + " is already taken");
  $("#username").val("");
  $("#password").val("");
});

socket.on("loginfailed", function (username) {
  alert(username + " was either not found or the password was incorrect");
  $("#username").val("");
  $("#password").val("");
});

socket.on("authenticationSuccessful", function () {
  connectGame();
  socket.emit("ConnectGame");
});

socket.on("WelcometoGame", function () {
  alert("Welcome " + username + "!");
});

socket.on("allTimeLeaderboard", function (scores) {
  let stats = scores.map(([name, score]) => `${name} ${score}`).join("<li>");
  $("#allTimeLeaderboardscores").html("<li>" + stats + "</li>");
});

$("#submitbutton").click(function () {
  let newChat = $("#chat").val();
  if (newChat) {
    socket.emit("addchats", username, newChat);
    $("#chat").val("");
  }
});

socket.on("chats", function (chatlog) {
  if (chatlog.length >= 1) {
    let formatted = chatlog.map(([name, msg]) => `${name}<br>${msg}`).join("<li>");
    $("#chatlist").html("<li>" + formatted + "</li>");
  }

  let chats = document.getElementById("chatlist");
  chats.scrollTop = chats.scrollHeight;
});

socket.on("users", function (userlog) {
  $("#users").html("<li>" + userlog.join("<li>") + "</li>");
});

socket.on("newHighScore", function (highscore, username) {
  alert("Congrats " + username + " on a new all time high score of " + highscore);
});

socket.on("WelcomeLogin", function (highscore) {
  alert("Welcome back " + username + "! Your all-time high score is " + highscore + " :)");
});

function random(min, max) {
  return Math.random() * (max - min) + min;
}
