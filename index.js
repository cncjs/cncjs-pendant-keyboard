#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const io = require('socket.io-client');
const jwt = require('jsonwebtoken');
const get = require('lodash.get');

const generateAccessToken = function(payload, secret, expiration) {
    const token = jwt.sign(payload, secret, {
        expiresIn: expiration
    });

    return token;
};

// Get secret key from the config file and generate an access token
const getUserHome = function() {
    return process.env[(process.platform === 'win32') ? 'USERPROFILE' : 'HOME'];
};

module.exports = function(options, callback) {
    options = options || {};
    options.secret = get(options, 'secret', process.env['CNCJS_SECRET']);
    options.baudrate = get(options, 'baudrate', 115200);
    options.socketAddress = get(options, 'socketAddress', 'localhost');
    options.socketPort = get(options, 'socketPort', 8000);
    options.controllerType = get(options, 'controllerType', 'Grbl');
    options.accessTokenLifetime = get(options, 'accessTokenLifetime', '30d');

    if (!options.secret) {
        const cncrc = path.resolve(getUserHome(), '.cncrc');
        try {
            const config = JSON.parse(fs.readFileSync(cncrc, 'utf8'));
            options.secret = config.secret;
            options.keyboards = config.keyboards;
        } catch (err) {
            console.error(err);
            process.exit(1);
        }
    }

    const token = "";//generateAccessToken({ id: '', name: 'cncjs-pendant' }, options.secret, options.accessTokenLifetime);
    const url = 'ws://' + options.socketAddress + ':' + options.socketPort + '?token=' + token;

    callback(null, null, options.keyboards);

    socket = io.connect('ws://' + options.socketAddress + ':' + options.socketPort, {
        'query': 'token=' + token
    });

    socket.on('connect', () => {
        console.log('Connected to ' + url);

        // Open port
        socket.emit('open', options.port, {
            baudrate: Number(options.baudrate),
            controllerType: options.controllerType
        });
    });

    socket.on('error', (err) => {
        console.error('Connection error.');
        if (socket) {
            socket.destroy();
            socket = null;
        }
    });

    socket.on('close', () => {
        console.log('Connection closed.');
    });

    socket.on('serialport:open', function(options) {
        options = options || {};

        console.log('Connected to port "' + options.port + '" (Baud rate: ' + options.baudrate + ')');

        callback(null, socket, options.keyboards);
    });

    socket.on('serialport:error', function(options) {
        callback(new Error('Error opening serial port "' + options.port + '"'), null, options.keyboards);
    });

    socket.on('serialport:read', function(data) {
        console.log((data || '').trim());
    });


    socket.on('serialport:write', function(data) {
        console.log((data || '').trim());
    });

};
