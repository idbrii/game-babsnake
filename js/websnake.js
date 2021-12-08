const tau = Math.PI * 2

function Vec3(x,y,z) {
    return new BABYLON.Vector3(x,y,z);
}

function Vec2(x,y) {
    return new BABYLON.Vector2(x,y);
}

function random_vector(max_radius) {
    // sqrt for uniform distribution: https://stackoverflow.com/a/50746409/79125
    const r = Math.sqrt(Math.random()) * max_radius
    const theta = Math.random() * tau;
    const x = r * Math.cos(theta)
    const y = r * Math.sin(theta)
    return Vec3(x,y,0);
}


class Input {
    constructor() {
        this.deadzone = 0.25;
        this.deadzone_sq = this.deadzone * this.deadzone;
        this.buttons = {};
        this.axes = {};
    }
    update(dt) {
        for (var key in this.buttons)
        {
            var value = this.buttons[key];
            this.buttons[key] = 0;
        }
        for (var key in this.axes)
        {
            var value = this.axes[key];
            this.axes[key] = 0;
        }
    }
    on_button_down(gamepad, btn) {
        //~ console.log(btn)
        this.buttons[btn] = 1;
    }

    on_button_up(gamepad, btn) {
        //~ console.log(btn)
        this.buttons[btn] = 0;
    }

    on_axis(gamepad, name, values) {
        const v = this.axes[name] || Vec2(0,0);

        v.x = values.x;
        v.y = values.y;
        if (v.lengthSquared() < this.deadzone_sq) {
            v.x = 0;
            v.y = 0;
        }
        //~ console.log("x:" + v.x.toFixed(3) + " y:" + v.y.toFixed(3));
        this.axes[name] = v;
    }
}

function get_button_ids_for_gamepad(gamepad) {
    if (gamepad instanceof BABYLON.Xbox360Pad) {
        return BABYLON.Xbox360Button;
    } else if (gamepad instanceof BABYLON.DualShockPad) {
        return BABYLON.DualShockButton;
    } else if (gamepad instanceof BABYLON.GenericPad) {
        return null;
    }
    return null;
}

function create_gamepad_manager(input) {
    var gamepadManager = new BABYLON.GamepadManager();

    gamepadManager.onGamepadConnectedObservable.add((gamepad, state)=>{
        const msg = "Connected: " + gamepad.id;
        console.log(msg);

        const button_ids = get_button_ids_for_gamepad(gamepad);

        // button down/up events
        gamepad.onButtonDownObservable.add((button, state)=>{
            input.on_button_down(gamepad, button);
        })
        gamepad.onButtonUpObservable.add((button, state)=>{
            input.on_button_up(gamepad, button);
        })

        // Stick events
        gamepad.onleftstickchanged((values)=>{
            input.on_axis(gamepad, "leftstick", values);
        });
        gamepad.onrightstickchanged((values)=>{
            input.on_axis(gamepad, "rightstick", values);
        });

        // Triggers events
        gamepad.onlefttriggerchanged((value)=>{
            input.on_axis(gamepad, "lefttrigger", values);
        })
        gamepad.onrighttriggerchanged((value)=>{
            input.on_axis(gamepad, "righttrigger", values);
        })

        // DPad events
        gamepad.onPadDownObservable.add((button, state)=>{
            input.on_button_down(gamepad, button);
        })
        gamepad.onPadUpObservable.add((button, state)=>{
            input.on_button_up(gamepad, button);
        })
    })

    gamepadManager.onGamepadDisconnectedObservable.add((gamepad, state)=>{
        const msg = "Disconnected: " + gamepad.id;
        console.log(msg);
    })

    return gamepadManager;
}


function start_websnake() {
    const canvas = document.getElementById("renderCanvas"); // Get the canvas element
    const engine = new BABYLON.Engine(canvas, true); // Generate the BABYLON 3D engine

    // Add your code here matching the playground format
    const createScene = function () {

        const scene = new BABYLON.Scene(engine);  

        const light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(1, 1, 0));

        const camera = new BABYLON.FollowCamera("FollowCam", new BABYLON.Vector3(0, 0, 30), scene);
        camera.radius = 30;
        camera.heightOffset = 10;
        camera.rotationOffset = 0;
        camera.cameraAcceleration = 0.005;
        camera.maxCameraSpeed = 10;
        camera.attachControl(canvas, true);

        for (let i = 0; i < 10; ++i)
        {
            const pebble = BABYLON.MeshBuilder.CreateBox("pebble", {});
            pebble.position = random_vector(10);
        }

        const box = BABYLON.MeshBuilder.CreateBox("box", {});
        camera.lockedTarget = box;

        var direction = true;
        scene.registerBeforeRender(function () {
            // Check if box is moving right
            if (box.position.x < 2 && direction) {
                // Increment box position to the right
                box.position.x += 0.05;
            }
            else {
                // Swap directions to move left
                direction = false;
            }

            // Check if box is moving left
            if (box.position.x > -2 && !direction) {
                // Decrement box position to the left
                box.position.x -= 0.05;
            }
            else {
                // Swap directions to move right
                direction = true;
            }
        });


        const input = new Input();
        var gamepadManager = create_gamepad_manager(input);

        return scene;
    };

    const scene = createScene();

    // Register a render loop to repeatedly render the scene
    engine.runRenderLoop(function () {
        scene.render();
    });

    // Watch for browser/canvas resize events
    window.addEventListener("resize", function () {
        engine.resize();
    });
}
