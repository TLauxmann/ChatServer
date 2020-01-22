$(document).ready(function() {

    var socket = io();
    const UPLOADLIMT = 20;
    const PROFILEPICTURESIZE = 5;

    //enter message and/or upload file
    $('#sendMsgForm').submit(function(e) {
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
                $('#file').val('');
                return;
            }
            reader.readAsDataURL(files[0]);
            reader.onload = function () {
                if (checkInputForTags(reader.result)){
                    $('#file').val('');
                    return;
                }
                $('.loader').css("display", "block");
                socket.emit('chat message', $('#m').val(), reader.result, writingToList, translate);
                $('#m').val('');
                $('#file').val('');
            };
            reader.onerror = function (error) {
                $('#file').val('');
                console.log('Error: ', error);
            };
        } else {
            if ($('#m').val().length === 0) return;
            if(translate){
                $('.loader').css("display", "block");
            }
            socket.emit('chat message', $('#m').val(), '', writingToList, translate);
            $('#m').val('');
        }
    });

    //recieve message and check for file   
    socket.on('chat message', function (data) {
        var messageObj = JSON.parse(data);
        msg = messageObj.msg;
        username = messageObj.username;
        file = messageObj.file;
        //TODO
        sendTo = messageObj.writingToList == "" ? [] : messageObj.writingToList;
        $('.loader').css("display", "none");
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

    socket.on('alertMsg', function (msg){
        $('.loader').css("display", "none");
        alert(msg);
    });
    
    //server check if Login successfull
    $('#submitLogin').click(function() {
        $('.loader').css("display", "block");
        socket.emit('checkName', $("#username").val(), $("#password").val());
    });

    //checks sign up input
    $('#submitSignUp').click(function(e) {
        e.preventDefault();
        if (!$("#suUsername").val() || !$("#suEmail").val() || !$("#suPsw").val() || !$("#suPsw-repeat").val()){
            //css shows required input
        } else if ($("#suUsername").val().length > 20) {
            alert("This username is too long!");
        } else if (checkInputForTags($("#suUsername").val())) {
            window.location.replace("https://www.polizei.de/Polizei/DE/Einrichtungen/ZAC/zac_node.html#doc25124bodyText1");
        /*} else if (!checkInputForEmail($("#suEmail").val())){
            alert("Please enter a valid email!")
        */} else{
            //compare PWs
            if ($("#suPsw").val().localeCompare($("#suPsw-repeat").val()) != 0){
                alert("Passwords do not match!");
            }else{
                //check file and transform
                const files = document.getElementById('profilePicture').files;
                if (files.length > 0) {
                    const bufferReader = new FileReader();
                    const base64Reader = new FileReader();
                    //check filesize
                    if (files[0].size / 1024 / 1024 > PROFILEPICTURESIZE) {
                        $('#profilePicture').val('');
                        alert("File size to large!")
                    } else if (!files[0].type.startsWith("image")) {
                        $('#profilePicture').val('');
                        alert("File type not supported")
                        return;
                    }
                    bufferReader.readAsArrayBuffer(files[0]);
                    base64Reader.readAsDataURL(files[0]);
                    bufferReader.onload = function () {
                        base64Reader.onload = function () {
                            $('#profilePicture').val('');
                            //pepare parameter for db
                            $('.loader').css("display", "block");
                            var signUpData = [$("#suUsername").val(), $("#suPsw").val(), $("#suEmail").val(), base64Reader.result]
                            socket.emit('signUp', signUpData, bufferReader.result);
                        }
                    };
                    bufferReader.onerror = function (error) {
                        $('#profilePicture').val('');
                        alert("Error while reading file");
                    };
                    base64Reader.onerror = function (error) {
                        $('#profilePicture').val('');
                        alert("Error while reading file");
                    };
                } else {
                    alert("You need to choose a picture from your filesystem")
                }                    
            }
        } 
    });

    socket.on('signUpSuccess', function(){
        $('.loader').css("display", "none");
        alert("Registration successful");
        document.getElementById('signUp').style.display = 'none'
    });

    socket.on('validLogin', function (usersOnline, profilePictures) {
        $('.loader').css("display", "none");
        mappedPicutres = new Map(profilePictures);
        $("#onlineList").html("");
        usersOnline.forEach(function(username) {
            $("#onlineList").append(`<li class=${username} ><img src=${mappedPicutres.get(username)} class="profilePic" ><button onclick="addToWritingList('${username}')" > ${username} </button></li>`);
        });
        $("#login").hide();
        $("#mainChat").show();
    });

    socket.on('invalidLogin', function() {
        $('.loader').css("display", "none");
        alert("This username already exists!")
    });

    socket.on('userJoint', function (data) {
        username = JSON.parse(data).username;
        picture = JSON.parse(data).picture;
        $("#onlineList").append(`<li class=${username} ><img src=${picture} class="profilePic" ><button onclick="addToWritingList('${username}')" > ${username} </button></li>`);
        $('#messages').append($('<li class=userJointLeft >').text(getCurrentTimestamp() + " " + username + " joint the chatroom"));
    });

    socket.on('userLeft', function(username) {
        var listClass = $("." + username);
        listClass[0].remove();
        $('#messages').append($('<li class=userJointLeft >').text(getCurrentTimestamp() + " " + username + " left the chatroom"));
    });

    socket.on('serverName', function(serverName){
        $('#serverId').html("Server: " + serverName);
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

function checkInputForEmail(email){
    var regularExp = /([a - z0 - 9!#$ %& '*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&' * +/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)/g;
    return regularExp.test(email);
}
