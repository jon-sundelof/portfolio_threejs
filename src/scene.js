import * as THREE from 'three';
import CANNON from 'cannon';
import Welcome from './welcome';

export default class Scene {
  constructor() {
    this.$container = document.getElementById('bg');

    this.W = window.innerWidth;
    this.H = window.innerHeight;

    this.setup();
    this.bindEvents();
  }

  bindEvents() {
    window.addEventListener('resize', () => {
      this.onResize();
    });
  }

  setup() {
    // Init Physics
    this.world = new CANNON.World();
    this.world.gravity.set(0, -20, 0);

    //Set Three components
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0x202533, -1, 100);

    this.clock = new THREE.Clock();

    //Setup settings for the enviroment
    this.setCamera();
    this.setLights();
    this.setRender();

    this.addObjects();

    /*     this.renderer.setAnimationLoop(() => {
      this.draw();
    }); */
  }

  setRender() {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      canvas: this.$container,
    });

    this.renderer.setClearColor(0xedf6e5);

    // this.renderer.setClearColor(0x202533);
    this.renderer.setSize(this.W, this.H);
    this.renderer.setPixelRatio(window.devicePixelRatio);

    this.renderer.shadowMap.enabled = true;

    this.renderer.setAnimationLoop(() => {
      this.draw();
    });
  }

  setCamera() {
    const aspect = window.innerWidth / window.innerHeight;
    const distance = 15;

    this.camera = new THREE.OrthographicCamera(
      -distance * aspect,
      distance * aspect,
      distance,
      -distance,
      -1,
      100
    );

    this.camera.position.set(-10, 4, 13);
    this.camera.lookAt(new THREE.Vector3());
  }

  setLights() {
    const ambientLight = new THREE.AmbientLight(0xcccccc);
    this.scene.add(ambientLight);

    const foreLight = new THREE.DirectionalLight(0xffffff, 0.3);
    foreLight.position.set(5, 5, 20);
    this.scene.add(foreLight);

    const backLight = new THREE.DirectionalLight(0xffffff, 1);
    backLight.position.set(-5, -5, -10);
    this.scene.add(backLight);
  }

  addObjects() {
    this.menu = new Welcome(this.scene, this.world, this.camera);
  }

  draw() {
    this.updatePhysics();
    this.renderer.render(this.scene, this.camera);
  }

  updatePhysics() {
    // Synchronize three meshes and Cannon.js rigid bodies
    this.menu.update();
    this.world.step(1 / 60);
  }

  onResize() {
    this.W = window.innerWidth;
    this.H = window.innerHeight;

    this.camera.aspect = this.W / this.H;

    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.W, this.H);
  }
}
