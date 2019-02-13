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
    let gameTimer, responseTimer;
    let gameInterval, responseInterval;
    let userPlay, opponentPlay;
    let gameRef;
    let noResponseModal = newModal('#no-response', "#nr-btn");
    let continueModal = newModal("#continue-playing");
    let opponentLeftModal = newModal("#opponent-left", "#ol-btn");

    $("#cp-btn-yes").on("click", async function(event){
        await continueModal.modal("hide");
        $("#cp-btn-yes").off("click");
        gameRef.transaction(function(game) {
            if(game === null)
                return game;
            else {
                game["p" + player + "ResponseRequested"] = false;
                return game;
            }
        }, console.log, false);
    });

    const tokensArr = $(".tokens");

    $("#playButton").on("click", function(event) {
        event.preventDefault();
        userName = $("#nameTextBar").val().trim();
        if(userName.length > 1) {
            $("#registration").remove();
            $("#mainContainer").removeAttr("hidden");
            newPlayer();
        }
        else
            $("#nameTextBar").attr("placeholder", "Enter a name...");
    });

    function addTokenOnClick() {
        $(".tokens").on("click", async function(event) {

            tokensArr.hide();

            await updateTokenPlayed($(this)[0].id);

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
                    return gameObject;
                }
            }, console.log, false);
            resolve(updateComplete);
        });
    }

    function newPlayer() {

        gameKey = database.ref("/games").push( {
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
            if(committed) {
                loadPlayer(player, gameKey);
            }

        }, false);
    }

    function loadPlayer(playerNumber, gameKey) {

        gameRef = database.ref("/games/" +gameKey);

        gameTimer = newTimer(checkOpponentEngagement, 20000);

        responseTimer = newTimer(newGamePrompt, 10000, noResponseModal, "#nr-btn-yes");

        addTokenOnClick();

        gameRef.transaction( function(gameObject) {

            if(gameObject) {
                gameObject["player" + playerNumber] = userName;
                gameObject["p" + playerNumber + "Token"] = false;
                gameObject["p" + playerNumber + "ResponseRequested"] = false;
                gameObject["p" + playerNumber + "Wins"] = 0;
                gameObject.gameComplete = false;
                return gameObject;
            }
            else
                return gameObject;
        }, console.log, false);

        
        registerGameListeners(playerNumber);
    }

    function registerGameListeners(user) {

        console.log("One listener");

        opponentNum = (user === "One" ? "Two" : "One");

        gameRef.child("/p" + player + "ResponseRequested").on("value", function(engagedSnap){
            if(engagedSnap.val()) {

                confirmContinue();

            }
        });


        gameRef.child("/p" + opponentNum + "ResponseRequested").on("value", function(opponentQuerySnap){

            console.log(opponentQuerySnap.val(), responseInterval);
            if(opponentQuerySnap.val() === false) {
                gameInterval = gameTimer.newCountdown(gameInterval);
            }
            else if(opponentQuerySnap.val() !== false && opponentQuerySnap.val() !== null) {
                console.log("here");
                if(!responseInterval)
                    responseInterval = responseTimer.newCountdown(responseInterval);
            }
        });

        gameRef.child("/player" + user).on("value", function(userSnap) {

            gameRef.once("value", function(snapshot){
                console.log(snapshot.val());
                if(snapshot.val() === null) {
                    newGamePrompt(opponentLeftModal);
                }
            });

            $("#card-pOne").text(userSnap.val());
        });

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

            opponentPlay = oppTokenSnap.val();
            if(opponentPlay)
                gameTimer.stop(gameInterval);
            if(userPlay) {
                showOpponentPlay();
            }
        
        });

        gameRef.child("/gameComplete").on("value", function(completeSnap) {
            if(completeSnap.val()) {

                displayResult(completeSnap.val());
                setTimeout(newCountdownScreen, 2500);

            }
        });
        
    }

    function newModal(modalName, buttonName) {
        if(buttonName) {
        $(buttonName + "-yes").on("click", async function(event) {
            gameRef.child("/player" + player).off("value");
            await continueModal.modal("hide");
            await opponentLeftModal.modal("hide");
            await noResponseModal.modal("hide");
            responseTimer.stop(responseInterval);
            responseInterval = undefined;
            gameTimer.stop(gameInterval);
            gameInterval = undefined;
            $("#nr-btn-no").off("click");
            $("#ol-btn-no").off("click");

            await gameRef.once("value", function(gameSnap) {
                if(gameSnap.val() !== null) {
                    let gameObjectKeys = Object.keys(gameSnap.val());
                    gameObjectKeys.forEach(function(pieces) {
                        gameRef.child("/" + gameSnap[pieces]).off();('value');
                    });
                }

            });

            gameRef.set({
                game: null,
            });
            
            newPlayer();
            newCountdownScreen();
        });

        $(buttonName + "-no").on("click", function(event) {
            modalID.modal("hide");
        });

    }

        return $(modalName).modal({
            keyboard: false,
            backdrop: "static",
        }).modal("hide");;
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

    function newTimer (endTimerCall, duration, cbArg1, cbArg2) {
    
        return {

            timeSet: duration,
            cbArg1: cbArg1,
            cbArg2: cbArg2,
            endTimerCall: endTimerCall,

            stop: function(intervalName) {            
                clearInterval(intervalName);
            },

            start: function() {        
                return setInterval(endTimerCall, this.timeSet);
            },

            newCountdown: function(intervalName) {
                let endTimerCall = this.endTimerCall;
                let cbArg1 = this.cbArg1;
                let cbArg2 = this.cbArg2;
                let timeSet = this.timeSet;
                if(intervalName)
                    clearInterval(intervalName);
                if(cbArg1 && cbArg2)
                    return setInterval(function() {
                        endTimerCall(cbArg1, cbArg2)
                    }, timeSet);
                else
                    return setInterval(endTimerCall, timeSet);
            }

        }

    }

    function checkOpponentEngagement() {

        gameTimer.stop(gameInterval);

        gameRef.transaction(function(game) {

            if(game === null) {
                return game;
            }

            else {
                if((game.pTwoWins != null) && game.pTwoResponseRequested === false)
                    game["p" + opponentNum + "ResponseRequested"] = true;
                return game;
            }
        }, console.log, false);
    }

    function newGamePrompt(modalID) {

        modalID.modal("show");
        
    }

    async function confirmContinue() {

        await continueModal.modal("show");
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
        }, console.log, false);
    }

    function addWinToScore(winner) {

        gameRef.transaction(function(game) {

            if(game === null) {
                return null;
            }

            else {
                game["p" + winner + "Wins"]++;
                return game;
            }

        }, console.log, false);

    }
    
    function displayResult(winner) {

        $("#tokenTray").append($("<h4>").text(winner + " Wins!").attr('id', "winTag").addClass("text-center w-100"));

    }

    function newCountdownScreen() {
        $(".tokens-played").attr("hidden", "true");
        
        $("#winTag").empty().remove();
        tokensArr.show();
        
        gameInterval = gameTimer.newCountdown(gameInterval);
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
        }, console.log, false);


    }
});