$(document).ready(function() {

    var socket = io();
    const UPLOADLIMT = 20;

    //enter message and/or upload file
    $('form').submit(function(e) {
        e.preventDefault();

        if(checkInputForTags($('#m').val())) return;

        var writingToList = [];
        $('.chosen').each(function(index) {
            writingToList.push($(this).attr("id"));
        });

        //check if user wants to translate text
        var translate = document.getElementById('checkboxTranslation').checked

        const files = document.getElementById('file').files;
        //check if message has file attached
        if (files.length > 0) {
            const reader = new FileReader();
            //check filesize
            if(files[0].size/1024/1024 > UPLOADLIMT){
                alert("File size to large!")
                return;
            }
            reader.readAsDataURL(files[0]);
            reader.onload = function () {
                if (checkInputForTags(reader.result)) return;
                socket.emit('chat message', $('#m').val(), reader.result, writingToList, translate);
                $('#m').val('');
                $('#file').val('');
            };
            reader.onerror = function (error) {
                console.log('Error: ', error);
            };
        } else {
            if ($('#m').val().length === 0) return;
            socket.emit('chat message', $('#m').val(), '', writingToList, translate);
            $('#m').val('');
        }
    });

    //recieve message and check for file   
    socket.on('chat message', function (msg, username, file, sendTo) {
        //create String for tooltip
        var sendToList = "";
        if (sendTo.length) {
            sendToList = '<br><div class= "tooltip">sent to<span class= "tooltiptext">'
            sendTo.forEach(function (chatpartner) {
                sendToList = sendToList.concat(chatpartner + "<br>");
            });
            sendToList = sendToList.concat("</span ></div>");
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
            } else{
                $('#messages').append(`<li> ${getCurrentTimestamp()} ${username}: MEDIATYPE NOT SUPPORTED! ${msg} ${sendToList} </li>`);
            }
        } else {
            $('#messages').append(`<li> ${getCurrentTimestamp()} ${username}: ${msg} ${sendToList} </li>`);
        }
    });

    socket.on('translationFailed', function (msg){
        alert(msg);
    });
    
    //checks if name already exists
    $('#submitName').click(function() {
        if ($("#username").val().length === 0){
            alert("No empty username!");
        } else if ($("#username").val().length > 20){
            alert("This username is too long!");
        } else if (checkInputForTags($("#username").val())){
            window.location.replace("https://www.polizei.de/Polizei/DE/Einrichtungen/ZAC/zac_node.html#doc25124bodyText1");
        } else {
            socket.emit('checkName', $("#username").val());
        }
    });

    socket.on('validLogin', function(usersOnline) {
        console.log($("#onlineList").html());
        $("#onlineList").html("");
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
        $('#messages').append($('<li class=userJointLeft >').text(getCurrentTimestamp() + " " + username + " joint the chatroom"));
    });

    socket.on('userLeft', function(username) {
        var listClass = $("." + username);
        listClass[0].remove();
        $('#messages').append($('<li class=userJointLeft >').text(getCurrentTimestamp() + " " + username + " left the chatroom"));
    });

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
    var button = $("." + username + " button");
    if (button.hasClass('chosen')) {
        button.css('background-color', 'lightgrey');
        button.removeClass('chosen');
        button.removeAttr('id');
    } else {
        button.css('background-color', 'lightgreen');
        button.addClass('chosen');
        button.attr('id', username);
    }
}

function checkInputForTags(input){
    var regularExp = /(<script(\s|\S)*?<\/script>)|(<style(\s|\S)*?<\/style>)|(<!--(\s|\S)*?-->)|(<\/?(\s|\S)*?>)/g;
    return regularExp.test(input);
}
