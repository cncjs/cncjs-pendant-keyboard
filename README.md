# cncjs-pendant-keyboard
This is a pendant to control [cncjs](https://github.com/cncjs/cncjs).
It allows you to configure a keyboard or numberic keypad to send commands to your cnc controller.
Two keyboards (or keyboard layouts) come predefined but you can configure any other type of keyboard.

# Installation

1. [Install cncjs](https://github.com/cncjs/cncjs#getting-started)
2. clone cncjs-pendant-keyboard
3. install
4. configure
5. setup startup

## clone cncjs-pendant-keyboard

```bash
git clone https://github.com/jochenderwae/cncjs-pendant-keyboard.git
```

## install

```bash
sudo apt update
sudo apt upgrade
sudo apt install libusb-1.0-0-dev libudev-dev

cd cncjs-pendant-keyboard
sudo npm install -g --unsafe-perm
```

## configure
To configure the keyboard, you'll need to run cncjs-pendant-keyboard twice.
* First to choose the keyboard you want to configure and prepare the OS for it
* Second time to set up the keybindings

After this setup, cncjs-pendant-keyboard is ready to be used.

### Choose keyboard
```bash
node bin/cncjs-pendant-keyboard
```
* You'll be asked what port you want to use. Choose the same as your cncjs setup
* Next you'll see a list of all keyboards found on the system. Select the one you want to use for the pendant
* The application will output what commands you need to run next (these will install a configuration file to allow cncjs-pendant-keyboard to access the keyboard you've chosen.

### Setup keymapping
```bash
node bin/cncjs-pendant-keyboard
```

Choose whatever setup method you prefer. At the end the configuration will be saved and cncjs-pendant-keyboard is ready to be used.

## setup startup
```bash
pm2 start $(which cncjs-pendant-keyboard) -- -p "/dev/ttyUSB0"
pm2 save
```

# Keymapping

## .cncrc
All keyboard settings and the keymap are stored in ~/.cncrc. You can edit the .cncrc file to build the keyboard settings and keymap or use one of the menus in cncjs-pendant-keyboard to do it.

### Keyboard configuration format
When editing .cncrc directly, add a `"keyboard":{}` section. it should look something like this:
```JSON
  "keyboards": [
    {
      "vendorId": 12345,
      "productId": 12345,
      "xinputName": "keyboard:Keyboard brand and model name",
      "keymap": {
        "42": {
          "amount": 0.1,
          "description": "Backspace: x0.1"
        },
        "83": {
          "toggleRepeat": true,
          "description": "Num Lock: repeat on/off"
        },
        "86": {
          "command": "pause",
          "description": "-: Pause"
        },
        "89": {
          "grbl": "G91 Z-{amount}",
          "canRepeat": true,
          "description": "1: z-"
        },
        "91": {
          "grbl": "M3 S0",
          "description": "3: spindle off"
        }
      }
    }
  ]
``` 
**Keyboards**
The `keyboards` property should contain an array of keyboard objects. You can add multiple objects but at this time only the first one is used in the application.
Property | Description
--- | ---
vendorId | The keyboard USB vendorId. Run `usb-devices` to see the list of devices with their names and ids. Keep in mind that in the output they're written as hexadecimal number and you need to fill them in here as decimals.
productId | The keyboard USB productId
xinputName | "keyboard:" followed by the name of the keyboard. Run `xinput --list` to see which ones are connected now.
keymap | A map of USB HID keyboard scan codes and the actions to perform when pressed.

**Keymap actions**
Property | Description
--- | ---
amount | Set the amount to fill in a GRBL command. Use this to set the distance a movement command moves the spindle
grbl | Send GRBL command to the CNC controller. `{amount}` is substituted with the current amount (set by the amount property)
command | Send on of the cncjs commands (start, stop, pause, resume, ...
toggleRepeat | Set repeat on or off. When on, a command that has `canRepeat` set to true will be repeated every 150 ms while the button is pressed
canRepeat | If set to true, this command can be repeated. If false, holding the key will do nothing more then pressing the key
description | Does functionally nothing, only used to add a description to the keybinding. This can be omitted.

Multiple properties of a keymap action can be filled in. If that's the case, they're processed in the order noted above.

## Menu based configuration: "Predefined keymaps"
When setting up the keymap using the cncjs-pendant-keyboard menu, you can select the predefined keymaps to set:
* the original layout 
![Hotkeys](https://raw.githubusercontent.com/nsfilho/cncjs-pendant-keyboard/master/docs/keysinfo.png)
* or this layout

```
┌──────┬──────┬──────┬──────┐
│Repeat│  x10 │  x1  │  x.1 │
├──────┼──────┼──────┼──────┤
│  Z+  │  X+  │ S.On │ Pause│
├──────┼──────┼──────┼──────┤
│  Y-  │ Home │  Y+  │Resume│
├──────┼──────┼──────┼──────┤
│  Z-  │  X-  │ S.Off│      │
├──────┴──────┼──────┤ Stop │
│Set cur. to 0│ Start│      │
└─────────────┴──────┴──────┘
```
