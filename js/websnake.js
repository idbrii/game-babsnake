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

function random_float(min, max) {
    return Math.random() * (max - min) + min;
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

function create_gamepad_manager(player_input) {
    var gamepadManager = new BABYLON.GamepadManager();
    gamepadManager.onGamepadConnectedObservable.add((gamepad, state)=>{
        const msg = "Connected: " + gamepad.id;
        console.log(msg);

        player_input.gamepad = gamepad
    });

    gamepadManager.onGamepadDisconnectedObservable.add((gamepad, state)=>{
        const msg = "Disconnected: " + gamepad.id;
        console.log(msg);
        if (player_input.gamepad == gamepad) {
            player_input.gamepad = null
        }
    })
    return gamepadManager;
}

class PlayerInput {
    constructor(input, target) {
        this.input = input;
        this.target = target
        this.deadzone = 0.25
        this.deadzone_sq = this.deadzone * this.deadzone;

        // Clear out movement keys to ensure valid values.
        this.input.on_button_up("keyboard", 'w')
        this.input.on_button_up("keyboard", 'a')
        this.input.on_button_up("keyboard", 's')
        this.input.on_button_up("keyboard", 'd')

        this.input.on_button_up("keyboard", 'b')
    }
    update(dt) {
        this.target.move_input = this.get_move();
    }
    get_move() {
        if (this.gamepad) {
            return this.stick_to_vec3(this.gamepad.leftStick);
        }
        const v = Vec3(0,0,0);
        v.x = this.input.buttons.d - this.input.buttons.a;
        v.y = this.input.buttons.s - this.input.buttons.w;
        return v;
    }
    stick_to_vec3(values) {
        const v = Vec3(values.x, values.y);
        return this.apply_deadzone(v);
    }
    apply_deadzone(v) {
        if (v.lengthSquared() < this.deadzone_sq) {
            v.x = 0;
            v.y = 0;
        }
        return v
    }
    is_requesting_bot() {
        return this.input.buttons.b
    }
}

class Player {
    constructor(scene, pebbles, pos) {
        this.head = BABYLON.MeshBuilder.CreateSphere("player_head", {});
        this.head.actionManager = new BABYLON.ActionManager(scene);
        this.body = [this.head]
        this.head.position = pos;
        this.gamepad = null;
        this.move_input = Vec3(0,0);

        // tuning
        this.speed = 0.005;

        for (let i in pebbles)
        {
            const pebble = pebbles[i];
            this.head.actionManager.registerAction(
                new BABYLON.ExecuteCodeAction(
                    {
                        trigger: BABYLON.ActionManager.OnIntersectionEnterTrigger, 
                        parameter: { 
                            mesh: pebble
                        }
                    },
                    (evt) => {
                        this.collide(pebble);
                    }
                ));
        }
    }
    update(dt) {
        var move = this.move_input
        //~ console.log("x:" + move.x.toFixed(3) + " y:" + move.y.toFixed(3));
        move.scaleInPlace(-1 * this.speed * dt); // axes are both flipped
        if (move.lengthSquared() > 0.0001) {
            for (let i = this.body.length - 1; i > 0; i--)
            {
                const b = this.body[i];
                const dest = this.body[i-1].position;
                b.position = BABYLON.Vector3.Lerp(b.position, dest, 0.1);
            }
            this.setPosition(this.head.position.add(move))
        }
    }
    setPosition(pos) {
        for (let i = this.body.length - 1; i > 0; i--)
        {
            const b = this.body[i];
            const dest = this.body[i-1].position;
            b.position = BABYLON.Vector3.Lerp(b.position, dest, 0.1);
        }
        this.head.position = pos
    }
    collide(pebble) {
        pebble.dispose();
        this.grow();
    }
    grow() {
        const box = BABYLON.MeshBuilder.CreateSphere("player_body", {
            size: 0.8
        });
        box.position = last(this.body).position;
        this.body.push(box)
    }
}

function create_bot(engine, scene, pebbles) {
    const bot_player = new Player(scene, pebbles, random_vector(10));
    bot_player.time = 0
    bot_player.movement_center = random_vector(10)
    bot_player.dir = random_float(0.5, 1)
    if (Math.random() > 0.5) {
        bot_player.dir *= -1
    }
    scene.registerBeforeRender(function () {
        const dt = engine.getDeltaTime()
        bot_player.time += dt * bot_player.dir
        const head_pos = bot_player.movement_center.add(Vec3(
            Math.sin(bot_player.time / 1900) * 10,
            Math.cos(bot_player.time / 1900) * 10,
            0))
        bot_player.setPosition(head_pos)
    })
    return bot_player
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
        camera.cameraAcceleration = 0.002;
        camera.maxCameraSpeed = 10;
        camera.attachControl(canvas, true);

        const pebbles = []
        for (let i = 0; i < 1000; ++i) {
            const p = BABYLON.MeshBuilder.CreateTorusKnot("pebble", {
                radius: 0.3,
                tube: 0.1,
                radialSegments: 32,
                p:5,
                q:2
            });
            p.position = random_vector(100);
            pebbles.push(p)
        }

        const local_player = new Player(scene, pebbles, Vec3(0,0,0));
        camera.lockedTarget = local_player.head;

        const input = new Input();
        const player_input = new PlayerInput(input, local_player);
        const players = [
            local_player,
        ];


        players.push(create_bot(engine, scene, pebbles))

        // For some reason, this takes a long time to start working.
        input.listen_to_keyboard(scene);
        var gamepadManager = create_gamepad_manager(player_input);

        let time = 0
        let next_bot = 0
        scene.registerBeforeRender(function () {
            const dt = engine.getDeltaTime()
            time += dt
            player_input.update(dt);
            for (var i in players)
            {
                const p = players[i];
                p.update(dt);
            }
            if (player_input.is_requesting_bot() && next_bot < time) {
                console.log("Created bot")
                next_bot = time + 2000
                players.push(create_bot(engine, scene, pebbles))
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
