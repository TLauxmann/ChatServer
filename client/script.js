$(document).ready(function() {

    var socket = io();

    //enter message
    $('form').submit(function(e) {
        e.preventDefault(); // prevents page reloading
        socket.emit('chat message', $('#m').val());
        $('#m').val('');
        return false;
    });

    //recieve message
    socket.on('chat message', function(msg, username) {
        $('#messages').append($('<li>').text(getCurrentTimestamp() + " " + username + ": " + msg));
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
    
    
    $('#sendFile').click(function(e){
        e.preventDefault();
        var files = document.getElementById('file').files;
        if (files.length > 0) {
            getBase64(files[0]);
        }
    });

    function getBase64(file) {
        var reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = function () {
            socket.emit('chat message', reader.result);
        };
        reader.onerror = function (error) {
            console.log('Error: ', error);
        };
    }
    
    function b64DecodeUnicode(str) {
        // Going backwards: from bytestream, to percent-encoding, to original string.
        return decodeURIComponent(atob(str).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
    }

});

function getCurrentTimestamp() {
    var today = new Date();
    var date = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate();
    var time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
    var dateTime = date + ' ' + time;
    return dateTime;
}
