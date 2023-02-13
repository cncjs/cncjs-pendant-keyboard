#!/usr/bin/env node



const inquirer = require("inquirer");
const hid = require("node-hid");
const fs = require('fs');
const path = require('path');
const data = require("./configuratorData.json");
const events = require('events');
const child_process = require("child_process");

var keyboardEvents = new events.EventEmitter();
var keyboard = null;
var keymap = {};
var keyboard_main = null;
var keyboard_extra = null;

doEnd = function() {
	if(keyboardEvents) {
		keyboardEvents.removeAllListeners();
		keyboardEvents = null;
	}
	
	if(keyboard_main) {
		keyboard_main.removeAllListeners();
		keyboard_main.close();
		keyboard_main = null;
	}
	
	if(keyboard_extra) {
		keyboard_extra.removeAllListeners();
		keyboard_extra.close();
		keyboard_extra = null;
	}
}

renderKeyboard = function() {
	graph = [
		"┌─┬┐",
		"│ ││",
		"├─┼┤",
		"└─┴┘"
	];
	data.keyboardLayouts;
}


var keyActions = [];
data.keyActions.forEach(function(action) {
	if(typeof action == "string") {
		keyActions.push(new inquirer.Separator(action));
	} else {
		action.value.description = action.name;
		keyActions.push(action);
	}
});

const getUserHome = function() {
    return process.env[(process.platform === 'win32') ? 'USERPROFILE' : 'HOME'];
};

saveKeyboard = function(keyboard) {
    const cncrc = path.resolve(getUserHome(), '.cncrc');
	const config = JSON.parse(fs.readFileSync(cncrc, 'utf8'));
	config.keyboards = [];
	config.keyboards.push(keyboard);
	fs.writeFileSync(cncrc, JSON.stringify(config, null, 2), 'utf8');
	
	console.log();
	console.log("configuration file written to disk: " + cncrc);
	console.log();
}

saveKeymap = function(keymap) {
	const cncrc = path.resolve(getUserHome(), '.cncrc');
	const config = JSON.parse(fs.readFileSync(cncrc, 'utf8'));
	config.keyboards[0].keymap = keymap;
	fs.writeFileSync(cncrc, JSON.stringify(config, null, 2), 'utf8');
	
	console.log();
	console.log("Configuration file written to disk: " + cncrc);
	console.log();
}

createUDEVConfiguration = function(keyboard) {
	var udevRules = `
SUBSYSTEM=="input"\\
, GROUP="input"\\
, MODE="0666"

SUBSYSTEM=="usb"\\
, ATTRS{idVendor}=="${keyboard.vendorId}"\\
, ATTRS{idProduct}=="${keyboard.productId}"\\
, MODE:="666"\\
, GROUP="plugdev"

KERNEL=="hidraw*"\\
, ATTRS{idVendor}=="${keyboard.vendorId}"\\
, ATTRS{idProduct}=="${keyboard.productId}"\\
, MODE="0666"\\
, GROUP="plugdev"`;
	
	const regex = /[^a-zA-Z0-9_]+/ig;
	var keyboardNamePath = keyboard.xinputName.replaceAll(regex, "-");
	var udevRulesFilename = `99-${keyboardNamePath}-permissions.rules`;
	
	fs.writeFileSync(udevRulesFilename, udevRules, 'utf8');
	console.log();
	console.log("New udev rules file created as ", udevRulesFilename);
	console.log("Please run following commands to install these rules:");
	console.log("-----------------------------------------------------------------------------------");
	console.log(`| sudo mv ${udevRulesFilename} /etc/udev/rules.d/${udevRulesFilename}`);
	console.log(`| sudo chown root:root /etc/udev/rules.d/${udevRulesFilename}`);
	console.log("| sudo udevadm control --reload");
	console.log("-----------------------------------------------------------------------------------");
	console.log("");
	console.log("Now, unplug the keyboard, plug it in again and start cncjs-pendant-keyboard after this to continue with the configuration.");
	
}

selectKeyboard = function() {
	var choices = [];
	keyboardFilter = function(value, index, array) {
      var i = array.findIndex(x => (x.vendorId == value.vendorId && x.productId == value.productId));
      if(i >= index){
        return true;
      }
      return false;
    }
    hid.devices().filter(keyboardFilter).forEach(function(device) {
		var choice = {};
		choice.name = "{manufacturer} {product} (vendorId: {vendorId} productId: {productId})".format(device);
		choice.value = {};
		choice.value.vendorId = device.vendorId;
		choice.value.productId = device.productId;
		choice.value.xinputName = "keyboard:{manufacturer} {product}".format(device);
        choices.push(choice);
    });
	
    inquirer.prompt([{
        type: 'list',
        name: 'keyboard',
        message: 'Select the keyboard you want to configure',
        choices: choices
    }]).then(function(answers) {
		console.clear();
        saveKeyboard(answers.keyboard);
        createUDEVConfiguration(answers.keyboard);
    });
}

confirmKeyboardConfiguration = function() {
	console.clear();
    inquirer.prompt([{
        type: 'list',
        name: 'continue',
        message: 'No keyboard configuration was found in .cncrc. Do you want to build one now?',
        choices: ["Yes", "No"]
    }]).then(function(answers) {
        if(answers.continue == "No") {
            return;
        } else {
			selectKeyboard();
		}
    });
}

confirmKeymap = function(keymap) {
	inquirer.prompt([{
        type: 'list',
        name: 'save',
        message: "Do you want to save this keymap?",
        choices: ["Yes", "No"]
    }]).then(function(answers) {
        if(answers.save == "Yes") {
            saveKeymap(keymap);
            doEnd();
        } else {
			console.log("Canceled.");
			doEnd();
		}
    });
}

setUpKeyboardListeners = function(keyboard) {
	child_process.exec("xinput --disable \"" + keyboard.xinputName + "\"",
		{env: {'DISPLAY': ':0','XAUTHORITY': '/run/user/1000/gdm/Xauthority'}},
		(error, stdout, stderr) => {
		if (error) {
			console.log(`error: ${error.message}`);
			return;
		}
		if (stderr) {
			console.log(`stderr: ${stderr}`);
			return;
		}
	});
	const findPath = interface =>
	hid
		.devices()
		.find(
			item =>
				item.vendorId === keyboard.vendorId &&
				item.productId === keyboard.productId &&
				item.interface === interface
		).path;

	keyboard_main = new hid.HID(findPath(0));
	keyboard_extra = new hid.HID(findPath(1));
	
	keyboard_main.on("data", function(data) {
		var recv = data.toJSON().data;
		var bits = recv.shift();
		recv.shift();
		var keycode = recv.shift();
		keyboardEvents.emit("keypress", keycode);
	});

	keyboard_extra.on("data", function(data) {
		var recv = data.toJSON().data;
		recv.shift();
		var keycode = recv.shift();
		keyboardEvents.emit("keypress", keycode);
	});
}

confirmSave = function(keymap) {
	inquirer.prompt([{
        type: 'list',
        name: 'save',
        message: `Do you want to save the keymap?`,
        choices: ["Save", "Quit without saving"]
    }]).then(function(answers) {
        if(answers.save == "Save") {
			saveKeymap(keymap);
			console.log("Saved");
			doEnd();
            return;
        } else {
			doEnd();
            return;
		}
    });
}

confirmKeyAssignment = function(keycode, action) {
	var key = keycode;
	var keyName = data.keyCodeToKey[keycode];
	var actionDescription = action.description;
	
	if(keyName) {
		keyName = `(${keyName})`;
	} else {
		keyName = "";
	}
	
	inquirer.prompt([{
        type: 'list',
        name: 'save',
        message: `Do you want to keep key ${key} ${keyName} = ${actionDescription}`,
        choices: [new inquirer.Separator("Last key"), "Keep", "Discard", new inquirer.Separator("All keys"), "Save and close", "Discard and close"]
    }]).then(function(answers) {
		if(answers.save == "Keep" || answers.save == "Save and close") {
			action.description = `${key} ${keyName}: ${actionDescription}`;
			keymap[keycode] = action;
		}
        if(answers.save == "Save and close") {
			saveKeymap(keymap);
			console.log("Saved");
			doEnd();
            return;
        } else if(answers.save == "Discard and close") {
			console.log("Canceled.");
			doEnd();
            return;
        } else {
			assignKey();
		}
    });
}

assignKeyListener = function(keycode) {
    keyboardEvents.removeAllListeners(["keypress"]);
	var key = keycode;
	var keyName = data.keyCodeToKey[keycode];
	
	if(keyName) {
		keyName = `(${keyName})`;
	} else {
		keyName = "";
	}
	
	inquirer.prompt([{
        type: 'list',
        name: 'action',
        message: `Select the action you want to assign to key ${key} ${keyName}`,
        choices: keyActions
    }]).then(function(answers) {
		confirmKeyAssignment(keycode, { ...answers.action });
    });
}

assignKey = function() {
	keyboardEvents.on("keypress", assignKeyListener);
	console.log("Press the key you want to configure...");
}

configureInteractiveKeymap = function() {
	console.clear();
	console.log("You'll now get to assign functions to the keys on your keypad or keyboard.");
	
	assignKey();
}

configurePredefinedKeymap = function() {
    inquirer.prompt([{
        type: 'list',
        name: 'keymap',
        message: "Select the legacy keymap you want to use.",
        choices: data.predefined
    }]).then(function(answers) {
        confirmKeymap(answers.keymap);
    });
}

confirmFixErrors = function(keymap, error) {
	console.clear();
    inquirer.prompt([{
        type: 'list',
        name: 'fix',
        message: `There was an error in your keymap: ${error}. Do you want to fix it?`,
        choices: ["Fix", "Quit"]
    }]).then(function(answers) {
        if(answers.fix == "Fix") {
            openConfigurationEditor(keymap);
        } else {
			doEnd();
		}
    });
}

openConfigurationEditor = function(keymapText) {
    inquirer.prompt([{
        type: 'editor',
        name: 'keymap',
        message: "Edit the keymap manually.",
        default: keymapText
    }]).then(function(answers) {
		var keymap = null;
        try {
			keymap = JSON.parse(`{${answers.keymap}}`);
		} catch(e) {
			if(e instanceof SyntaxError) {
				confirmFixErrors(answers.keymap, e.message);
				return;
			}
		}
        confirmSave(keymap);
    });
}

keyboardWizard = function() {
    inquirer.prompt([
		{
			type: 'list',
			name: 'columns',
			message: "How many columns of keys does your keypad have?",
			choices: ["4", "5", "6", "7"]
		},
		{
			type: 'list',
			name: 'rows',
			message: "How many columns of keys does your keypad have?",
			choices: ["5", "6"]
		}
    ]).then(function(answers) {
    });
}


configureKeymapMethod = function() {
	console.clear();
    inquirer.prompt([{
        type: 'list',
        name: 'method',
        message: "How do you want to set up the key mappings?",
        choices: [
			/*{name:"Wizard (press a few buttons and a matching layout is selected - numeric keypad only)", value:"wizard"},*/
			{name:"Interactive (press a button and select the function)", value:"interactive"},
			{name:"Manual (start with a blank JSON file and edit it manually)", value:"manual"},
			{name:"Predefined keymaps (ideal for one of the legacy layouts)", value:"predefined"},
			{name:"Cancel", value:"cancel"}
		]
    }]).then(function(answers) {
        if(answers.method == "wizard") {
            return;
        } else if(answers.method == "interactive") {
            configureInteractiveKeymap();
        } else if(answers.method == "manual") {
            openConfigurationEditor(data.exampleMapping.join("\n"));
        } else if(answers.method == "predefined") {
            configurePredefinedKeymap();
        } else {
			doEnd();
		}
    });
}


module.exports = function(keyboards) {
	if(!keyboards
	|| !(keyboards instanceof Array)
	|| keyboards.length == 0
	|| !keyboards[0]
	|| !keyboards[0].vendorId
	|| !keyboards[0].productId) {
		
		confirmKeyboardConfiguration();
	}
	else if(!keyboards[0].keymap
	|| Object.keys(keyboards[0].keymap).length == 0) {
		
		setUpKeyboardListeners(keyboards[0]);
		configureKeymapMethod();
	} else {
		// nothing to do here
		return keyboards;
	}
}

