A simple chat server

At http://socket.io/get-started/chat/ you can find a simple chat application developed with node.js. You can use this source code as a basis for your own development.

Enhance the socket.io chat room server so that

    a new user has to register with the website first by providing a user name
    in the chat room, all messages should be displayed in chronological order with a timestamp and the user name of the user who has posted the message.
    a marked message is generated and sent to the chat room each time a new user connects to the chat room or leaves the chat room.
    a user list of all logged in users is displayed and updated
    a user can send a message to one dedicated recipient (private message) instead of to all online users in the chat room
    a user can send a message to defined subset of users (multicast); the recipients are informed about to whom this message was sent.
    a user can send multi-media files to the participants of a chat room or via a private or multicast message, e.g., pictures, movies, sound files.

Please note, that the source code developed in this exercise will be used in further exercises. Hence, develop with maintainability and extensibility in mind!