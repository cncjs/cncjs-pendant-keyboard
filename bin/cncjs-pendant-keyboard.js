#!/usr/bin/env node

var fs = require("fs");
var path = require("path");
var program = require("commander");
var serialport = require("serialport");
var inquirer = import("inquirer");
var pkg = require("../package.json");
var serverMain = require("../index");
var hid = require("node-hid");
var options = {};

program
    .version(pkg.version)
    .usage("-s <secret> -p <port> [options]")
    .option("-l, --list", "list available ports then exit")
    .option("-s, --secret", "the secret key stored in the ~/.cncrc file")
    .option("-p, --port <port>", "path or name of serial port")
    .option("-b, --baudrate <baudrate>", "baud rate (default: 115200)", 115200)
    .option(
        "--socket-address <address>",
        "socket address or hostname (default: localhost)",
        "localhost"
    )
    .option("--socket-port <port>", "socket port (default: 8000)", 8000)
    .option(
        "--controller-type <type>",
        "controller type: Grbl|Smoothie|TinyG (default: Grbl)",
        "Grbl"
    )
    .option(
        "--access-token-lifetime <lifetime>",
        "access token lifetime in seconds or a time span string (default: 30d)",
        "30d"
    );

program.parse(process.argv);

var options = {
    secret: program.secret,
    port: program.port,
    baudrate: program.baudrate,
    socketAddress: program.socketAddress,
    socketPort: program.socketPort,
    controllerType: program.controllerType,
    accessTokenLifetime: program.accessTokenLifetime
};

if (options.list) {
    serialport.list(function(err, ports) {
        if (err) {
            console.error(err);
            process.exit(1);
        }
        ports.forEach(function(port) {
            console.log(port.comName);
        });
    });
    return;
}

var store = {
    controller: {
        state: {},
        settings: {}
    },
    sender: {
        status: {}
    }
};

var kbdevent = {
    l_control: 0,
    l_shift: 0,
    l_alt: 0,
    l_meta: 0,
    r_control: 0,
    r_shift: 0,
    r_alt: 0,
    r_meta: 0,
    key: 0, // Normal keys
    extra: 0, // Advanced Keys or Special Keys
    repeating: 0, // If it is repating a movement
    can_repeat: 1, // If can repeat
    move: 1, // Actually move size
    default_move: 1 // Alter by F1, F2, F3
};

//console.log(hid.devices())

var createServer = function(options) {
    serverMain(options, function(err, socket, options) {
        if(socket) {
            // Grbl
            socket.on("Grbl:state", function(state) {
                store.controller.state = state;
            });
            socket.on("Grbl:settings", function(settings) {
                store.controller.settings = settings;
            });

            // Smoothie
            socket.on("Smoothie:state", function(state) {
                store.controller.state = state;
            });
            socket.on("Smoothie:settings", function(settings) {
                store.controller.settings = settings;
            });

            // TinyG
            socket.on("TinyG:state", function(state) {
                store.controller.state = state;
            });
            socket.on("TinyG:settings", function(settings) {
                store.controller.settings = settings;
            });

            // Sender
            socket.on("sender:status", function(data) {
                store.sender.status = data;
            });
        }

        

        const findPath = interface =>
            hid
                .devices()
                .find(
                    item =>
                        item.vendorId === 1578 &&
                        item.productId === 16641 &&
                        item.interface === interface
                ).path;

        //console.log("Keyboard HID Address:", findPath(0), " & ", findPath(1));
        var keyboard_main = new hid.HID(findPath(0));
        var keyboard_extra = new hid.HID(findPath(1));
        console.log("here");

        keyboard_main.on("data", function(data) {
            console.log(data);
           /* var recv = data.toJSON().data;
            var bits = recv.shift();
            kbdevent.l_control = (bits & 1) !== 0;
            kbdevent.l_shift = (bits & 2) !== 0;
            kbdevent.l_alt = (bits & 4) !== 0;
            kbdevent.l_meta = (bits & 8) !== 0;
            kbdevent.r_control = (bits & 16) !== 0;
            kbdevent.r_shift = (bits & 32) !== 0;
            kbdevent.r_alt = (bits & 64) !== 0;
            kbdevent.r_meta = (bits & 128) !== 0;
            recv.shift();
            kbdevent.key = recv.shift();
            kbdevent.repeating = 0;
            sendToController();*/
        });

        keyboard_extra.on("data", function(data) {
            console.log(data);
            /*var recv = data.toJSON().data;
            recv.shift();
            kbdevent.extra = recv.shift();
            kbdevent.repeating = 0;
            sendToController();*/
        });

        /*function sendToController() {
            // Calculate move size modifiers
            kbdevent.move = kbdevent.default_move;
            if (kbdevent.l_alt || kbdevent.r_alt) {
                kbdevent.move = 0.1;
            } else if (
                kbdevent.l_shift ||
                kbdevent.r_shift ||
                kbdevent.r_meta
            ) {
                kbdevent.move = 10;
            }

            // Process pressed key
            switch (kbdevent.extra) {
                case 234: // vol+
                    socket.emit(
                        "write",
                        options.port,
                        "G91 Z-" + kbdevent.move + ";\n"
                    );
                    break;
                case 233: // vol-
                    socket.emit(
                        "write",
                        options.port,
                        "G91 Z" + kbdevent.move + ";\n"
                    );
                    break;
                case 131: // Media: Play (Top corner left)
                    socket.emit("write", options.port, "G10 L20 P1 X0;\n");
                    break;
                case 138: // E-mail (Top corner left)
                    socket.emit("write", options.port, "G10 L20 P1 Y0;\n");
                    break;
                case 226: // Mute (Top corner left)
                    socket.emit("write", options.port, "G10 L20 P1 Z0;\n");
                    break;
                case 1: // Mouse Left (Top corner left)
                    socket.emit(
                        "write",
                        options.port,
                        "G10 L20 P1 X0 Y0 Z0;\n"
                    );
                    break;
                case 148: // Key: Home -> Goto Zero-working position
                    socket.emit("write", options.port, "G90 X0 Y0 Z0;\n");
                    break;
                default:
                    break;
            }
            switch (kbdevent.key) {
                case 80: // arrow: left
                    socket.emit(
                        "write",
                        options.port,
                        "G91 X-" + kbdevent.move + ";\n"
                    );
                    break;
                case 79: // arrow: right
                    socket.emit(
                        "write",
                        options.port,
                        "G91 X" + kbdevent.move + ";\n"
                    );
                    break;
                case 82: // arrow: up
                    socket.emit(
                        "write",
                        options.port,
                        "G91 Y" + kbdevent.move + ";\n"
                    );
                    break;
                case 81: // arrow: down
                    socket.emit(
                        "write",
                        options.port,
                        "G91 Y-" + kbdevent.move + ";\n"
                    );
                    break;
                case 58: // key: F1
                    kbdevent.default_move = 0.1;
                    break;
                case 59: // key: F2
                    kbdevent.default_move = 1;
                    break;
                case 60: // key: F3
                    kbdevent.default_move = 10;
                    break;
                case 40: // Key: OK or Enter
                    kbdevent.can_repeat = kbdevent.can_repeat ? 0 : 1;
                default:
                    break;
            }

            if (
                (kbdevent.extra || kbdevent.key) &&
                kbdevent.can_repeat &&
                kbdevent.key != 40 && // Key: Enter / OK -- change repeat function
                kbdevent.extra != 148 // Special Key: Home -- goto Zero-working position
            ) {
                if (!kbdevent.repeating) {
                    kbdevent.repeating = 1;
                    setTimeout(sendToController, 1000);
                } else {
                    setTimeout(sendToController, 150);
                }
            } else {
                kbdevent.repeating = 0;
            }

            console.log(kbdevent);
        }*/
    });
};

// console.log('List of connected devices (paths): ');
// console.log('devices:', hid.devices());

if (true || options.port) {
    createServer(options);
    return;
}

/*
serialport.SerialPort.list(function(err, ports) {
    if (err) {
        console.error(err);
        process.exit(1);
    }
    const choices = ports.map(function(port) {
        return port.comName;
    });

    inquirer
        .prompt([
            {
                type: "list",
                name: "port",
                message: "Specify which port you want to use?",
                choices: choices
            }
        ])
        .then(function(answers) {
            options.port = answers.port;

            createServer(options);
        });
});*/
