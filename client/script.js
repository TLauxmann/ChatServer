$(document).ready(function() {

    $(function() {

        var socket = io();

        //enter message
        $('form').submit(function(e) {

            e.preventDefault(); // prevents page reloading
            socket.emit('chat message', $('#m').val());
            $('#m').val('');
            return false;
        });

        //recieve message
        socket.on('chat message', function(msg) {
            $('#messages').append($('<li>').text(msg));
        });

        //checks if name already exists
        $('#submitName').click(function() {
            if ($("#username").val()) {
                socket.emit('checkName', $("#username").val());
            }
        });

        socket.on('validLogin', function(usersOnline) {
            usersOnline.forEach(function(username) {
                $("#onlineList").append("<li id=" + username + ">" + username + "</li>");
            });
            $("#login").hide();
            $("#mainChat").show();
        });

        socket.on('invalidLogin', function() {
            alert("This username already exists!")
        });

        socket.on('userJoint', function(username) {
            $("#onlineList").append("<li id=" + username + ">" + username + "</li>");
        });

        socket.on('userLeft', function(username) {
            $("#" + username).remove();
        });


    });
});