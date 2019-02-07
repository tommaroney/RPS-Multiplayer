  // Initialize Firebase
  var config = {
    apiKey: "AIzaSyDb9dOaCZJmlO0zrtvSHc63MzPvd6ZJy0o",
    authDomain: "rps-multiplayer-8adbe.firebaseapp.com",
    databaseURL: "https://rps-multiplayer-8adbe.firebaseio.com",
    projectId: "rps-multiplayer-8adbe",
    storageBucket: "rps-multiplayer-8adbe.appspot.com",
    messagingSenderId: "623099910198"
  };

  firebase.initializeApp(config);

  let database = firebase.database();

$(document).ready(function () {

    let player, opponentNum;
    let userName, opponentName;
    let gameKey;
    let userPlay, opponentPlay;
    let gameRef;

    const tokensArr = $(".tokens");

    $("#playButton").on("click", function(event) {
        userName = $("#nameTextBar").val().trim();
        $("#registration").remove();
        $("#mainContainer").removeAttr("hidden");
        newPlayer();
    });

    function addTokenOnClick() {
        $(".tokens").on("click", async function(event) {

            tokensArr.hide();

            await updateTokenPlayed($(this)[0].id);

            console.log(opponentPlay, userPlay);

            if(opponentPlay && userPlay) {
                gameLogic(userPlay, opponentPlay);
                setTimeout(initializeNewMatch, 2500);
            }
        });
    }   

    async function updateTokenPlayed(tokenID) {
        return new Promise(async function(resolve){
            let updateComplete = await  gameRef.transaction(function(gameObject) {
                if(gameObject === null) {
                    return null
                }

                else {
                    gameObject["p" + player + "Token"] = tokenID;
                    console.log("returning from token");
                    return gameObject;
                }
            });
            resolve(updateComplete);
        });
    }

    function newPlayer() {

        gameKey = database.ref("/games").push( {
            initialized: false,
            playerOne: "Waiting for Player One",
            playerTwo: "Waiting for Player Two",
        }).key;

        database.ref("/gameKeys").transaction( function(gameList) {

            if(gameList) {
                
                database.ref('/games/' + gameKey).set({});
                
                let gameKeyName = Object.keys(gameList)[Object.keys(gameList).length-1];
                gameKey = gameList[gameKeyName];
                gameList[gameKeyName] = null;
                player = "Two";

                return gameList;
            }

            else {

                player = "One";

                return {
                    ["gameID" + userName]: gameKey,
                };

            }

        }, function(error, committed, snapshot) {

            console.log(error);
            console.log(committed);
            console.log(snapshot.val())
            if(committed) {
                loadPlayer(player, gameKey);
            }

        });
    }

    function loadPlayer(playerNumber, gameKey) {

        gameRef = database.ref("/games/" +gameKey);

        addTokenOnClick();

        gameRef.transaction( function(gameObject) {

            if(gameObject) {
                gameObject["player" + playerNumber] = userName;
                gameObject["p" + playerNumber + "Token"]= false;
                gameObject["p" + playerNumber + "Wins"] = 0;
                gameObject.initialized = true;
                gameObject.gameComplete = false;
                return gameObject;
            }
            else
                return gameObject;
        });

        
        displayListener(playerNumber);
    }

    function displayListener(user) {

        opponentNum = (user === "One" ? "Two" : "One");

        gameRef.child("/player" + user).on("value", function(userSnap) {
            $("#card-pOne").text(userSnap.val());
        });

        console.log((user === "One") ? "Two" : "One");

        gameRef.child("/player" + opponentNum).on("value", function(opponentSnap) {
            opponentName = opponentSnap.val();
            $("#card-pTwo").text(opponentSnap.val());
        });

        gameRef.child("/p" + user + "Wins").on("value", function(winsSnap) {
            $('#card-score').text(winsSnap.val());
        });

        gameRef.child("/p" + opponentNum + "Wins").on("value", function(oppWinsSnap) {
            $("#card-opp-score").text(oppWinsSnap.val());
        });

        gameRef.child("/p" + user + "Token").on("value", function(tokenSnap){
            
            userPlay = tokenSnap.val();
            $("#user-play #" + userPlay).removeAttr("hidden");
            if(opponentPlay) {
                showOpponentPlay();
            }
            
        });

        gameRef.child("/p" + opponentNum + "Token").on("value", function(oppTokenSnap){

            console.log(oppTokenSnap.val());
            opponentPlay = oppTokenSnap.val();
            if(userPlay) {
                showOpponentPlay();
            }
        
        });

        gameRef.child("/gameComplete").on("value", function(completeSnap) {
            if(completeSnap.val()) {

                displayResult(completeSnap.val());
                setTimeout(resetScreen, 2500);
            }
        })
        
    }

    function showOpponentPlay() {
        if(userPlay && opponentPlay)
            $("#opponent-play #" + opponentPlay).removeAttr("hidden");
    }

    function gameLogic(userRPS, opponentRPS) {
        switch(userRPS) {
            case "rock":
                if (opponentRPS === "rock") {
                updateGameComplete("No one");
                }
                else if (opponentRPS === "scissors") {
                updateGameComplete($("#card-pOne").text());
                addWinToScore(player);
                }
                else if (opponentRPS === "paper") {
                updateGameComplete($("#card-pTwo").text());
                addWinToScore(opponentNum);
                }
                break;
            case "paper":
                if (opponentRPS === "rock") {
                updateGameComplete($("#card-pOne").text());
                addWinToScore(player);
                }
                else if (opponentRPS === "scissors") {
                updateGameComplete($("#card-pTwo").text());
                addWinToScore(opponentNum);
                }
                else if (opponentRPS === "paper") {
                updateGameComplete("No one");
                }
                break;
            case "scissors":
                if (opponentRPS === "rock") {
                updateGameComplete($("#card-pTwo").text());
                addWinToScore(opponentNum);
                }
                else if (opponentRPS === "scissors") {
                updateGameComplete("No one");
                }
                else if (opponentRPS === "paper") {
                updateGameComplete( $("#card-pOne").text() );
                addWinToScore(player);
                }
                break;
        }
    }

    function updateGameComplete(matchResult) {

        gameRef.transaction(function(game){
            if(game === null) {
                return game;
            }

            else {
                game.gameComplete = matchResult;
                return game;
            }
        });
    }

    function addWinToScore(winner) {

        gameRef.transaction(function(game) {

            if(game === null) {
                return null;
            }

            else {
                console.log(game);
                game["p" + winner + "Wins"]++;
                return game;
            }

        });

    }
    
    function displayResult(winner) {

        $("#tokenTray").append($("<h4>").text(winner + " Wins!").attr('id', "winTag").addClass("text-center w-100"));

    }

    function resetScreen() {
        $(".tokens-played").attr("hidden", "true");
        
        $("#winTag").empty().remove();
        tokensArr.show();
    }
    
    function initializeNewMatch() {
        gameRef.transaction(function(game) {
            if(game === null) {
                return game;
            }

            else {
                game["p" + opponentNum + "Token"] = false;
                game["p" + player + "Token"] = false;
                game["gameComplete"] = false;
                return game;
            }
        });


    }
});