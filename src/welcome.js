import * as THREE from 'three';
import CANNON from 'cannon';
const fontURL = './src/fonts/droid_sans_mono_regular.typeface.json';

// CONSTANTS
const margin = 7;
const totalMass = 1;
const force = 25;
/////////////////////

export default class Welcome {
  constructor(scene, world, camera) {
    // The DOM Elements
    this.$navItems = document.querySelectorAll('.welcomeNav a');

    // The physical world
    this.world = world;
    this.offset = this.$navItems.length * margin * 0.5;

    //The camera
    this.camera = camera;
    this.mouse = new THREE.Vector2();
    this.raycaster = new THREE.Raycaster();

    //Initilize the scene
    this.scene = scene;

    //Loads the font to mesh
    this.loader = new THREE.FontLoader();

    // Constants
    this.words = [];

    this.loader.load(fontURL, (f) => {
      this.setup(f);
    });

    // Bind events
    document.addEventListener('click', () => {
      this.onClick();
    });
    window.addEventListener('mousemove', (e) => {
      this.onMouseMove(e);
    });
  }

  onMouseMove(event) {
    // We set the normalized coordinate of the mouse
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  }

  onClick() {
    // update the picking ray with the camera and mouse position
    this.raycaster.setFromCamera(this.mouse, this.camera);

    // calculate objects intersecting the picking ray
    // It will return an array with intersecting objects
    const intersects = this.raycaster.intersectObjects(
      this.scene.children,
      true
    );

    if (intersects.length > 0) {
      const obj = intersects[0];
      const { object, face } = obj;

      if (!object.isMesh) return;

      const impulse = new THREE.Vector3()
        .copy(face.normal)
        .negate()
        .multiplyScalar(force);

      this.words.forEach((word, i) => {
        word.children.forEach((letter) => {
          const { body } = letter;

          if (letter !== object) return;

          // We apply the vector 'impulse' on the base of our body
          body.applyLocalImpulse(impulse, new CANNON.Vec3());
        });
      });
    }
  }

  setup(f) {
    // Settings to give the font a better look
    const fontOptions = {
      font: f,
      size: 4,
      height: 0.4,
      curveSegments: 5,
      bevelEnabled: true,
      bevelThickness: 0.35,
      bevelSize: 0.3,
      bevelOffset: 0,
      bevelSegments: 4,
    };

    const groundMat = new CANNON.Material();
    const letterMat = new CANNON.Material();

    const contactMaterial = new CANNON.ContactMaterial(groundMat, letterMat, {
      friction: 0.01,
    });

    this.world.addContactMaterial(contactMaterial);

    // For each element in the menu
    Array.from(this.$navItems).forEach(($item, i) => {
      // Get the text
      const { innerText } = $item;

      const words = new THREE.Group();

      words.letterOff = 0;

      words.ground = new CANNON.Body({
        mass: 0,
        shape: new CANNON.Box(new CANNON.Vec3(50, 0.2, 50)),
        position: new CANNON.Vec3(0, i * margin - this.offset, 0),
        material: groundMat,
      });

      this.world.addBody(words.ground);

      // Parse Each letter and generate mesh
      Array.from(innerText).forEach((letter, j) => {
        const material = new THREE.MeshPhongMaterial({
          color: 0xcccccc,
          // color: 0x852d82,
        });
        const geometry = new THREE.TextBufferGeometry(letter, fontOptions);

        geometry.computeBoundingBox();
        geometry.computeBoundingSphere();

        const mesh = new THREE.Mesh(geometry, material);

        // Get size of our entire mesh
        mesh.size = mesh.geometry.boundingBox.getSize(new THREE.Vector3());

        // We'll use this accumulator to get the offset of each letter. Notice that this is not perfect because each character of each font has specific kerning.
        words.letterOff += mesh.size.x;

        // Create the shape of our letter
        // Note that we need to scale down our geometry because of Box's Cannon.js class setup
        const box = new CANNON.Box(
          new CANNON.Vec3().copy(mesh.size).scale(0.5)
        );

        // Attach the body directly to the mesh
        mesh.body = new CANNON.Body({
          // We divide the totalmass by the length of the string to have a common weight for each words.
          mass: totalMass / innerText.length,
          position: new CANNON.Vec3(words.letterOff, this.getOffsetY(i), 0),
          material: letterMat,
        });

        // Add the shape to the body and offset it to match the center of our mesh
        const { center } = mesh.geometry.boundingSphere;
        mesh.body.addShape(box, new CANNON.Vec3(center.x, center.y, center.z));
        // Add the body to our world
        this.world.addBody(mesh.body);
        words.add(mesh);
      });
      // Recenter each body based on the whole string.
      words.children.forEach((letter) => {
        letter.body.position.x -= letter.size.x + words.letterOff * 0.5;
      });

      this.words.push(words);
      this.scene.add(words);
    });
    this.setConstraints();
  }
  update() {
    if (!this.words) return;

    this.words.forEach((word, j) => {
      for (let i = 0; i < word.children.length; i++) {
        const letter = word.children[i];

        letter.position.copy(letter.body.position);
        letter.quaternion.copy(letter.body.quaternion);
      }
    });
  }
  setConstraints() {
    this.words.forEach((word) => {
      for (let i = 0; i < word.children.length; i++) {
        // We get the current letter and the next letter (if it's not the penultimate)
        const letter = word.children[i];
        const nextLetter =
          i === word.children.length - 1 ? null : word.children[i + 1];

        if (!nextLetter) continue;

        // I choosed ConeTwistConstraint because it's more rigid that other constraints and it goes well for my purpose
        const c = new CANNON.ConeTwistConstraint(letter.body, nextLetter.body, {
          pivotA: new CANNON.Vec3(letter.size.x, 0, 0),
          pivotB: new CANNON.Vec3(0, 0, 0),
        });

        // Optionnal but it gives us a more realistic render in my opinion
        c.collideConnected = true;

        this.world.addConstraint(c);
      }
    });
  }

  // Function that return the exact offset to center our menu in the scene
  getOffsetY(i) {
    return (this.$navItems.length - i - 1) * margin - this.offset;
  }
}
