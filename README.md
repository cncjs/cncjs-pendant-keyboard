# cncjs-pendant-keyboard
A simple pendant based on wireless keyboard (as USB Input)

![Wireless keyboard](https://images-na.ssl-images-amazon.com/images/I/71d%2Bn0r4ceL._SY355_.jpg)

## Installation
After cloning the repository to your work directory, change into this directory and run
```
npm install
```

Make sure you have installed the following packages
```
libusb-1.0-0-dev
libudev-dev
```
These can be installed with apt-get.

## Usage
Run `bin/cncjs-pendant-keyboard` to start. Pass --help to `cncjs-pendant-keyboard` for more options.

```
bin/cncjs-pendant-keyboard --help
```

Hotkeys:

![Hotkeys](https://raw.githubusercontent.com/nsfilho/cncjs-pendant-keyboard/master/docs/keysinfo.png)
