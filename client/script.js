$(document).ready(function() {

    var socket = io();

    //enter message and/or upload file
    $('form').submit(function(e) {
        e.preventDefault();
        const writingToList = [];
        $("#writingToList").children().each(function (index) {
            writingToList.push($(this).attr("id"))
        });
        const files = document.getElementById('file').files;
        //check if message has file attached
        if (files.length > 0) {
            const reader = new FileReader();
            reader.readAsDataURL(files[0]);
            reader.onload = function () {
                socket.emit('chat message', $('#m').val(), reader.result, writingToList);
                $('#m').val('');
                $('#file').val('');
            };
            reader.onerror = function (error) {
                console.log('Error: ', error);
            };
        } else {
            socket.emit('chat message', $('#m').val(),'', writingToList);
            $('#m').val('');
        }
    });

    //recieve message and check for file   
    socket.on('chat message', function (msg, username, file, sendTo) {

        //create String for tooltip
        var sendToList = '<br><div class= "tooltip">Send to<span class= "tooltiptext">';
        if (sendTo.length) {
            sendTo.forEach(function (chatpartner) {
                sendToList = sendToList.concat(chatpartner + "<br>");
            });
            sendToList = sendToList.concat("</span ></div>");
        }else{
            sendToList = "";
        }

        //check file
        if (file && file.substr(0,4) == "data") {
            const fileType = file.split(":")[1].substr(0, 5);
            if (fileType == "image") {
                appendMedia(username, file, msg, "img", sendToList);
            } else if (fileType == "video"){
                appendMedia(username, file, msg, "video", sendToList);
            } else if (fileType == "audio") {
                appendMedia(username, file, msg, "audio", sendToList);
            }/* else if ((file.split(": ",2)[1]).substr(5,4) == "text") {
                var decodedText = b64DecodeUnicode((file.split(": ",2)[1]).split(";base64,",2)[1]);
                $('#messages').append('<li> <p>' + file.split(": ",2)[0] + ' has sent a text file: ' + decodedText + '</p>');
            } else if ((file.split(": ",2)[1]).substr(5,11) == "application") {
                if ((file.split(": ",2)[1]).substr(17,12) == "octet-stream") {
                    var decodedText = b64DecodeUnicode((file.split(": ",2)[1]).split(";base64,",2)[1]);
                    $('#messages').append('<li> <p>' + file.split(": ",2)[0] + ' has sent a text file: ' + decodedText + '</p>');
                }
            }*/
        } else {
            $('#messages').append(`<li> ${getCurrentTimestamp()} ${username}: ${msg} ${sendToList} </li>`);
        }
    });

    socket.on('private message', function (msg, username){ 
        $('#messages').append($('<li class="private">').text(getCurrentTimestamp() + " " + username + ": " + msg));
    });
    
    //checks if name already exists
    $('#submitName').click(function() {
        if ($("#username").val()) {
            socket.emit('checkName', $("#username").val());
        }
    });

    socket.on('validLogin', function(usersOnline) {
        usersOnline.forEach(function(username) {
            $("#onlineList").append(`<li class=${username} ><button onclick="addToWritingList('${username}')" > ${username} </button></li>`);
        });
        $("#login").hide();
        $("#mainChat").show();
    });

    socket.on('invalidLogin', function() {
        alert("This username already exists!")
    });

    socket.on('userJoint', function(username) {
        $("#onlineList").append(`<li class=${username} ><button onclick="addToWritingList('${username}')" > ${username} </button></li>`);
        $('#messages').append($('<li>').text(getCurrentTimestamp() + " " + username + " joint the chatroom"));
    });

    socket.on('userLeft', function(username) {
        var listClass = $("." + username);
        listClass[0].remove();
        if(listClass[1]){
            listClass[1].remove();
        }
        $('#messages').append($('<li>').text(getCurrentTimestamp() + " " + username + " left the chatroom"));
    });
      
    function b64DecodeUnicode(str) {
        // Going backwards: from bytestream, to percent-encoding, to original string.
        return decodeURIComponent(atob(str).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
    }

});

function appendMedia(username, file, msg, mediaType, sendToList) {
    $('#messages').append(`<li> ${getCurrentTimestamp()} ${username}: <${mediaType} height="300" width="300" src="${file}" controls > ${mediaType == 'img' ? '' : `<p>Your browser doesnt support HTML ${mediaType}.</p>`} </${mediaType}><br><p>${msg}</p> ${sendToList}</li>`);
}

function getCurrentTimestamp() {
    var today = new Date();
    var date = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate();
    var time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
    var dateTime = date + ' ' + time;
    return dateTime;
}

function addToWritingList(username){
    if (!$("#" + username).length){
        $("#writingToList").append(`<li id=${username} class=${username} ><button onclick="deleteElementById('${username}')" > ${username} </button></li>`);
    }
}

function deleteElementById(id){
    $("#" + id).remove();
}
