import * as THREE from "three";
import GUI from "lil-gui";
import { OrbitControls } from "three/examples/jsm/Addons.js";
import { clock, pauseClock, resumeClock } from "./clock";

let vertexMeshes;

// Debug UI using lil-gui ------------------------------------------------------
const debugObject = {
  waveAmplitude: 5,
  rotation: true,
  width: 200,
  depth: 200,
  compactness: 2,
};

const gui = new GUI({
  width: 340,
  title: "Demo",
});

// Hide/Show the debug window on keypress('h')
window.addEventListener("keydown", (event) => {
  if (event.key == "h") {
    gui._hidden ? gui.show() : gui.hide();
  }
});
// -----------------------------------------------------------------------------

// -----------------------------------------------------------------------------
// * Base
const canvas = document.querySelector("canvas.webgl");

// Raycaster: Look it up
const raycaster = new THREE.Raycaster();
raycaster.params.Points.threshold = 0.3;
const pointer = new THREE.Vector2();

// Constants for the canvas area dimensions.
const renderSizes = {
  width: window.innerWidth,
  height: window.innerHeight,
};

// Scene
const scene = new THREE.Scene();

// Camera
const camera = new THREE.PerspectiveCamera(
  75, // fov(vertical)
  renderSizes.width / renderSizes.height,
  0.1, // Near clipping
  300 // Far clipping
);

camera.position.x = 40;
camera.position.y = 20;
camera.position.z = 40;

// Orbit Controls
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true; // momentum

// Renderer
const renderer = new THREE.WebGLRenderer({ canvas: canvas });
renderer.setSize(renderSizes.width, renderSizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// -----------------------------------------------------------------------------
// Axes Helper
// Just to help render the points
const axesHelper = new THREE.AxesHelper(1000);
axesHelper.visible = false;

const debugFolder = gui.addFolder("Debugging Options");
debugFolder.add(axesHelper, "visible").name("Show Axes Helper");

debugFolder.add(debugObject, "rotation").name("Rotate");

scene.add(axesHelper);

// -----------------------------------------------------------------------------
// Point Sheet.
// Let's make a sheet of points first. Function so as to manipulate it using gui
function generatePointsGeometry() {
  const width = debugObject.width;
  const depth = debugObject.depth;
  const numberOfPoints = depth * width;

  const geometry = new THREE.BufferGeometry();
  const vertices = new Float32Array(numberOfPoints * 3);
  const verticesColors = new Float32Array(numberOfPoints * 3);

  const redColor = new THREE.Color(1, 0, 0);
  const greenColor = new THREE.Color(0, 1, 0);
  const blueColor = new THREE.Color(0, 0, 1);

  const RGBColors = [redColor, greenColor, blueColor];

  let pointCount = 0;
  for (let i = 0; i < width; i++) {
    for (let k = 0; k < depth; k++) {
      const x = i / debugObject.compactness;
      const z = k / debugObject.compactness;

      const y = Math.sin(x / 5) + Math.cos(z / 5);

      // Deducting by  width/4 and depth/4 to center the points about the origin.
      vertices[3 * pointCount] = x - width / 4;
      vertices[3 * pointCount + 1] = y * debugObject.waveAmplitude;
      vertices[3 * pointCount + 2] = z - depth / 4;

      // To assign colors, dividing the points on the X-axis(width) into three and
      // assigning red, green, blue depending on which section the point is on.
      // Intensity is determined by the Y-axis value of the point.
      const vertexSectionNum = Math.floor(i / (width / 3));
      const color = RGBColors[vertexSectionNum];

      verticesColors[3 * pointCount] = color.r;
      verticesColors[3 * pointCount + 1] = color.g;
      verticesColors[3 * pointCount + 2] = color.b;

      pointCount++;
    }
  }
  // console.log(vertices);

  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(vertices, 3)
  );
  geometry.setAttribute("color", new THREE.BufferAttribute(verticesColors, 3));
  geometry.computeBoundingBox();
  return geometry;
}

const geometry = generatePointsGeometry();
const material = new THREE.PointsMaterial({ size: 0.1, vertexColors: true });
const points = new THREE.Points(geometry, material);
scene.add(points);

camera.lookAt(points);

// Setup Debugging
const pointsDebugFolder = gui.addFolder("Point Sheet Controls");
pointsDebugFolder
  .add(debugObject, "compactness")
  .min(1)
  .max(5)
  .step(0.5)
  .name("Points Separation")
  .onChange(() => {
    points.geometry.dispose();
    points.geometry = generatePointsGeometry();
  });

pointsDebugFolder
  .add(debugObject, "width")
  .min(1)
  .max(800)
  .step(100)
  .name("Sheet Width")
  .onChange(() => {
    points.geometry.dispose();
    points.geometry = generatePointsGeometry();
  });

pointsDebugFolder
  .add(debugObject, "depth")
  .min(1)
  .max(800)
  .step(100)
  .name("Sheet Depth")
  .onChange(() => {
    points.geometry.dispose();
    points.geometry = generatePointsGeometry();
  });

// -----------------------------------------------------------------------------
// Animation

// This seems to work like crap with the controls for now.
// function animate() {
//   renderer.render(scene, camera);
// }
// renderer.setAnimationLoop(animate);

const mousePoint = new THREE.Mesh(
  new THREE.SphereGeometry(0.5, 4, 4),
  new THREE.MeshBasicMaterial({ color: 0xff0000 })
);
scene.add(mousePoint);

function tick() {
  const elapsedTime = clock.getElapsedTime();

  // Mouse Pointer
  raycaster.setFromCamera(pointer, camera);
  const intersects = raycaster.intersectObjects([points]);

  if (intersects.length > 0) {
    const intersect = intersects[0];
    const point = intersect.point;
    mousePoint.position.set(point.x, point.y, point.z);
  }

  // Update controls
  controls.update();

  // Rotation
  // points.rotation.y = elapsedTime * 0.15;
  controls.autoRotate = debugObject.rotation;

  // Render the scene.
  renderer.render(scene, camera);

  // Call tick again on the next frame.
  window.requestAnimationFrame(tick);
}

// -----------------------------------------------------------------------------
function onPointerMove(event) {
  pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
  // handleMouseOver();
}

function handleMouseOver() {
  // raycaster.setFromCamera(pointer, camera);
  // const intersects = raycaster.intersectObjects([points], false);
  // if (intersects.length > 0){
  //   const intersect = intersects[0];
  //   mousePoint.position.set(intersect.point.x, intersect.point.y, intersect.point.z);
  // }
}

function onWindowResize() {
  // Set new width and height for render
  console.log("resizing...");
  renderSizes.width = window.innerWidth;
  renderSizes.height = window.innerHeight;

  // This will also mess with our camera (creates distortion). Needs reset.
  camera.aspect = renderSizes.width / renderSizes.height;
  camera.updateProjectionMatrix();

  renderer.setSize(renderSizes.width, renderSizes.height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
}

window.addEventListener("pointermove", onPointerMove);
window.addEventListener("resize", onWindowResize);
// -----------------------------------------------------------------------------

tick();
