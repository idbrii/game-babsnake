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
    constructor(body) {
        this.gamepad = null;
        this.body = body
        this.deadzone = 0.25
        this.deadzone_sq = this.deadzone * this.deadzone;
        this.speed = 0.005;
    }
    update(dt) {
        var move = this.get_move();
        //~ console.log("x:" + move.x.toFixed(3) + " y:" + move.y.toFixed(3));
        move.scaleInPlace(-1 * this.speed * dt); // axes are both flipped
        // For some reason this.body.position.add(move) produces Nan.
        this.body.position.x += move.x;
        this.body.position.y += move.y;
    }
    get_move() {
        if (this.gamepad) {
            return this.stick_to_vec2(this.gamepad.leftStick);
        }
        return Vec2(0,0);
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

        for (let i = 0; i < 10; ++i)
        {
            const pebble = BABYLON.MeshBuilder.CreateBox("pebble", {});
            pebble.position = random_vector(10);
        }

        const player_body = BABYLON.MeshBuilder.CreateBox("player_body", {});
        player_body.position = Vec3(0,0,0);
        camera.lockedTarget = player_body;

        const local_player = new Player(player_body);
        const players = [
            local_player,
        ];

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
