const tau = Math.PI * 2

function Vec3(x,y,z) {
    return new BABYLON.Vector3(x,y,z);
}

function random_vector(max_radius) {
    // sqrt for uniform distribution: https://stackoverflow.com/a/50746409/79125
    const r = Math.sqrt(Math.random()) * max_radius
    const theta = Math.random() * tau;
    const x = r * Math.cos(theta)
    const y = r * Math.sin(theta)
    return Vec3(x,y,0);
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
