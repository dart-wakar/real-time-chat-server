## Real Time Chat Server

This project is built on express.js framework.The real time chat feature is handled with Socket.io.

## Prerequisites

1) node.js
2) npm
3) mongodb
4) nodemon ,would be convenient if installed.

## Setup instructions

1) Start the mongod service to host the database locally.Run
    ```sh
    $ sudo service mongod start
    ```
    This should start the mongod service and host the database on the default port ,i.e,27017.

2) Clone and install dependencies:
    ```sh
    $ git clone https://github.com/dart-wakar/real-time-chat-server.git
    $ cd real-time-chat-server
    $ npm install
    ```

3) Run the server locally:
    ```sh
    $ nodemon server.js
    ```
    If everything worked properly the following should be logged on the node terminal.
    ```sh
    Websocket listening on 3000
    Connected to database !
    ```