# websnake

A simple snake game built in Babylon.js.


## Devlog

I built this to play around with Babylon.js. The initial game (up to b89097d)
took three hours to build.

### Gripes

* Input: I found Babylon's input system annoying to use since I can't seem to query keyboard state.
* Collision: Can't seem to generically respond to any collision event. Couldn't get onCollideObservable to call my listener. moveWithCollision isn't helpful since I want to respond to collision events. ActionManager.registerAction was the best I could find and even then, the documentation didn't have an obvious complete example: [collisionsTriggers](https://doc.babylonjs.com/guidedLearning/createAGame/collisionsTriggers).
* No implicit conversion from Vec2 -> Vec3. I was baffled why my .add and .addInPlace kept producing NaN.
