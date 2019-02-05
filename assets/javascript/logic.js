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

    let player;
    let userName, opponentName;
    let gameKey;
    let userPlay, opponentPlay;
    let gameRef;
    let pOneToken, pTwoToken;
    const tokensArr = $(".tokens");

    $("#playButton").on("click", function(event) {
        userName = $("#nameTextBar").val().trim();
        $("#registration").remove();
        $("#mainContainer").removeAttr("hidden");
        newPlayer();
    });

    function addTokenOnClick() {
        $(".tokens").on("click", function(event) {

            tokensArr.hide();
            updateTokenPlayed($(this)[0].id);
        });
    }   

    function updateTokenPlayed(tokenID) {
        gameRef.transaction(function(gameObject) {
            if(gameObject === null) {
                return null
            }

            else {
                gameObject["p" + player + "Token"] = tokenID;
                return gameObject;
            }
        })
    }

    function initializeNewMatch() {
        $("#gameSpace").empty();
        tokensArr.show();
    }

    function newPlayer() {

        gameKey = database.ref("/games").push({
            initialized: false,
            playerOne: "Waiting for Player One",
            playerTwo: "Waiting for Player Two",
        }).key;

        database.ref("/gameKeys").transaction( function(gameList) {
        // database.ref("/needsOpponent").once('value').then(function(snapshot) {
            if(gameList) {

                
                database.ref('/games/' + gameKey).set({});
                
                let gameKeyName = Object.keys(gameList)[Object.keys(gameList).length-1];
                gameKey = gameList[gameKeyName];
                gameList[gameKeyName] = null;
                gameRef = database.ref("/games/" +gameKey);
                player = "Two";

                return gameList;
            }

            else {
                player = "One";
                gameRef = database.ref("/games/" + gameKey);
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

        addTokenOnClick();

        gameRef.transaction( function(gameObject) {

            if(gameObject) {
                gameObject["player" + playerNumber] = userName;
                gameObject["p" + playerNumber + "Token"]= false;
                gameObject["p" + playerNumber + "Wins"] = 0;
                gameObject.gameID = gameKey;
                gameObject.initialized = true;
                return gameObject;
            }
            else
                return gameObject;
        });

        
        displayListener(playerNumber);
    }

    function displayListener(user) {

        let opponentNum = (user === "One" ? "Two" : "One");

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
            if(tokenSnap.val()) {
                userPlay = $("#" + tokenSnap.val()).clone();
                $("#gameSpace").prepend(userPlay.show());
                if(opponentPlay) {
                    showOpponentPlay();
                    gameLogic(userPlay.id, opponentPlay.id);
                }
            }
        });

        gameRef.child("/p" + opponentNum + "Token").on("value", function(oppTokenSnap){
            if(oppTokenSnap.val())
                opponentPlay = $("#" + oppTokenSnap.val()).clone();
            if(userPlay) {
                showOpponentPlay();
                gameLogic(userPlay.attr('id'), opponentPlay.attr('id'));
            }
        });

    }

    function showOpponentPlay() {
        console.log("userPlay: " + userPlay +" typeof " + typeof userPlay, "opponentPlay: " + opponentPlay + " typeof " + typeof opponentPlay);
        if(userPlay && opponentPlay)
            $("#gameSpace").prepend(opponentPlay.show());
    }

    function gameLogic(userRPS, opponentRPS) {
        console.log(userRPS, opponentRPS);
    }
    
});