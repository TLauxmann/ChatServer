$(document).ready(function() {

    var socket = io();

    //enter message and/or upload file
    $('form').submit(function(e) {
        e.preventDefault();
        const files = document.getElementById('file').files;
        if (files.length > 0) {
            const reader = new FileReader();
            reader.readAsDataURL(files[0]);
            reader.onload = function () {
                socket.emit('chat message with file', $('#m').val(), reader.result);
                $('#m').val('');
                $('#file').val('');
            };
            reader.onerror = function (error) {
                console.log('Error: ', error);
            };
        } else {
            socket.emit('chat message', $('#m').val());
            $('#m').val('');
        }
    });

    //recieve message and check for file   
    socket.on('chat message', function (msg, username, file) {
        if (file && file.substr(0,4) == "data") {
            var fileType = file.split(":")[1].substr(0, 5);
            if (fileType == "image") {
                appendMedia(username, file, msg, "img");
            } else if (fileType == "video"){
                appendMedia(username, file, msg, "video");
            } else if (fileType == "audio") {
                appendMedia(username, file, msg, "audio");
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
             $('#messages').append($('<li>').text(getCurrentTimestamp() + " " + username + ": " + msg));
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
            $("#onlineList").append(`<li id= ${username} ><button> ${username} </button></li>`);
        });
        $("#login").hide();
        $("#mainChat").show();
    });

    socket.on('invalidLogin', function() {
        alert("This username already exists!")
    });

    socket.on('userJoint', function(username) {
        $("#onlineList").append(`<li id= ${username} ><button> ${username} </button></li>`);
        $('#messages').append($('<li>').text(getCurrentTimestamp() + " " + username + " joint the chatroom"));
    });

    socket.on('userLeft', function(username) {
        $("#" + username).remove();
        $('#messages').append($('<li>').text(getCurrentTimestamp() + " " + username + " left the chatroom"));
    });
      
    function b64DecodeUnicode(str) {
        // Going backwards: from bytestream, to percent-encoding, to original string.
        return decodeURIComponent(atob(str).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
    }

});

function appendMedia(username, file, msg, mediaType) {
    $('#messages').append(`<li> ${getCurrentTimestamp()} ${username}: <${mediaType} height="300" width="300" src="${file}" controls > ${mediaType == 'img' ? '' : `<p>Your browser doesnt support HTML ${mediaType}.</p>`} </${mediaType}><br><p>${msg}</p>`);
}

function getCurrentTimestamp() {
    var today = new Date();
    var date = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate();
    var time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
    var dateTime = date + ' ' + time;
    return dateTime;
}
