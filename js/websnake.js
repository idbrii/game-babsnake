const tau = Math.PI * 2

function Vec3(x,y,z) {
    return new BABYLON.Vector3(x,y,z);
}

function Vec2(x,y) {
    return new BABYLON.Vector2(x,y);
}

function last(list) {
    return list[list.length - 1];
}

function random_vector(max_radius) {
    // sqrt for uniform distribution: https://stackoverflow.com/a/50746409/79125
    const r = Math.sqrt(Math.random()) * max_radius
    const theta = Math.random() * tau;
    const x = r * Math.cos(theta)
    const y = r * Math.sin(theta)
    return Vec3(x,y,0);
}


function get_button_prettynames_for_gamepad(gamepad) {
    if (gamepad instanceof BABYLON.Xbox360Pad) {
        return BABYLON.Xbox360Button;
    } else if (gamepad instanceof BABYLON.DualShockPad) {
        return BABYLON.DualShockButton;
    } else if (gamepad instanceof BABYLON.GenericPad) {
        return null;
    }
    return null;
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
    listen_to_keyboard(scene) {
        scene.onKeyboardObservable.add((kbInfo) => {
            switch (kbInfo.type) {
                case BABYLON.KeyboardEventTypes.KEYDOWN:
                    this.on_button_down("keyboard", kbInfo.event.key);
                    break;

                case BABYLON.KeyboardEventTypes.KEYUP:
                    this.on_button_up("keyboard", kbInfo.event.key);
                    break;
            }
        });
    }
}

function create_gamepad_manager(local_player) {
    var gamepadManager = new BABYLON.GamepadManager();
    gamepadManager.onGamepadConnectedObservable.add((gamepad, state)=>{
        const msg = "Connected: " + gamepad.id;
        console.log(msg);

        local_player.gamepad = gamepad
    });

    gamepadManager.onGamepadDisconnectedObservable.add((gamepad, state)=>{
        const msg = "Disconnected: " + gamepad.id;
        console.log(msg);
        if (local_player.gamepad == gamepad) {
            local_player.gamepad = null
        }
    })
    return gamepadManager;
}

class Player {
    constructor(head, input) {
        this.gamepad = null;
        this.input = input
        this.head = head
        this.deadzone = 0.25
        this.deadzone_sq = this.deadzone * this.deadzone;
        this.speed = 0.005;
        this.body = [head]

        // Clear out movement keys to ensure valid values.
        this.input.on_button_up("keyboard", 'w')
        this.input.on_button_up("keyboard", 'a')
        this.input.on_button_up("keyboard", 's')
        this.input.on_button_up("keyboard", 'd')
    }
    update(dt) {
        var move = this.get_move();
        //~ console.log("x:" + move.x.toFixed(3) + " y:" + move.y.toFixed(3));
        move.scaleInPlace(-1 * this.speed * dt); // axes are both flipped
        if (move.lengthSquared() > 0.0001) {
            for (let i = this.body.length - 1; i > 0; i--)
            {
                const b = this.body[i];
                const dest = this.body[i-1].position;
                b.position = BABYLON.Vector3.Lerp(b.position, dest, 0.1);
            }
        }
        // For some reason this.head.position.add(move) produces Nan.
        this.head.position.x += move.x;
        this.head.position.y += move.y;
    }
    get_move() {
        if (this.gamepad) {
            return this.stick_to_vec2(this.gamepad.leftStick);
        }
        const v = Vec2(0,0);
        v.x = this.input.buttons.d - this.input.buttons.a;
        v.y = this.input.buttons.s - this.input.buttons.w;
        return v;
    }
    stick_to_vec2(values) {
        const v = Vec2(values.x, values.y);
        return this.apply_deadzone(v);
    }
    apply_deadzone(v) {
        if (v.lengthSquared() < this.deadzone_sq) {
            v.x = 0;
            v.y = 0;
        }
        return v
    }
    collide(pebble) {
        pebble.dispose();
        this.grow();
    }
    grow() {
        const box = BABYLON.MeshBuilder.CreateBox("player_body", {
            size: 0.8
        });
        box.position = last(this.body).position;
        this.body.push(box)
    }
}


function start_websnake() {
    const canvas = document.getElementById("renderCanvas"); // Get the canvas element
    const engine = new BABYLON.Engine(canvas, true); // Generate the BABYLON 3D engine

    const createScene = function () {

        const scene = new BABYLON.Scene(engine);  

        const light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(1, 1, 0));

        const camera = new BABYLON.FollowCamera("FollowCam", new BABYLON.Vector3(0, 0, 30), scene);
        camera.radius = 30;
        camera.heightOffset = 0;
        camera.rotationOffset = 0;
        camera.cameraAcceleration = 0.05;
        camera.maxCameraSpeed = 10;
        camera.attachControl(canvas, true);

        const player_head = BABYLON.MeshBuilder.CreateBox("player_head", {});
        player_head.position = Vec3(0,0,0);
        player_head.actionManager = new BABYLON.ActionManager(scene);
        camera.lockedTarget = player_head;

        const input = new Input();
        const local_player = new Player(player_head, input);
        const players = [
            local_player,
        ];

        for (let i = 0; i < 10; ++i) {
            const pebble = BABYLON.MeshBuilder.CreateBox("pebble", {});
            pebble.position = random_vector(10);

            player_head.actionManager.registerAction(
                new BABYLON.ExecuteCodeAction(
                    {
                        trigger: BABYLON.ActionManager.OnIntersectionEnterTrigger, 
                        parameter: { 
                            mesh: pebble
                        }
                    },
                    (evt) => {
                        local_player.collide(pebble);
                    }
                ));
        }

        // For some reason, this takes a long time to start working.
        input.listen_to_keyboard(scene);
        var gamepadManager = create_gamepad_manager(local_player);

        scene.registerBeforeRender(function () {
            for (var i in players)
            {
                const p = players[i];
                p.update(engine.getDeltaTime());
            }
        })

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
