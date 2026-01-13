import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { ARButton } from 'https://unpkg.com/three@0.160.0/examples/jsm/webxr/ARButton.js';
import { GLTFLoader } from 'https://unpkg.com/three@0.160.0/examples/jsm/loaders/GLTFLoader.js';

let camera, scene, renderer, controller;
let reticle, model;
let hitTestSource = null;
let hitTestRequested = false;
let placed = false;

const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

if (isIOS) {
  document.getElementById("iosBtn").style.display = "block";
}

init();
animate();

function init() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera();

  renderer = new THREE.WebGLRenderer({ antialias:true, alpha:true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);

  const light = new THREE.HemisphereLight(0xffffff, 0x444444, 1.3);
  scene.add(light);

  reticle = new THREE.Mesh(
    new THREE.RingGeometry(0.08,0.12,32).rotateX(-Math.PI/2),
    new THREE.MeshBasicMaterial({ color:0x00ff00 })
  );
  reticle.visible = false;
  reticle.matrixAutoUpdate = false;
  scene.add(reticle);

  const loader = new GLTFLoader();
  loader.load("spongebob.glb", gltf => {
    model = gltf.scene;
    model.visible = false;
    model.scale.set(0.6,0.6,0.6);
    scene.add(model);
  });

  document.body.appendChild(
    ARButton.createButton(renderer,{ requiredFeatures:["hit-test"] })
  );

  controller = renderer.xr.getController(0);
  controller.addEventListener("select", () => {
    if (reticle.visible && model) {
      model.visible = true;
      model.position.setFromMatrixPosition(reticle.matrix);
      model.quaternion.setFromRotationMatrix(reticle.matrix);
      placed = true;
      reticle.visible = false;
    }
  });
  scene.add(controller);
}

function animate() {
  renderer.setAnimationLoop(render);
}

function render(_, frame) {
  if (frame) {
    const refSpace = renderer.xr.getReferenceSpace();
    const session = renderer.xr.getSession();

    if (!hitTestRequested) {
      session.requestReferenceSpace("viewer").then(space=>{
        session.requestHitTestSource({space}).then(source=>{
          hitTestSource = source;
        });
      });
      hitTestRequested = true;
    }

    if (hitTestSource && !placed) {
      const hits = frame.getHitTestResults(hitTestSource);
      if (hits.length) {
        const pose = hits[0].getPose(refSpace);
        reticle.visible = true;
        reticle.matrix.fromArray(pose.transform.matrix);
      }
    }
  }
  renderer.render(scene,camera);
}
